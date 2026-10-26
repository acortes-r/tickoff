import type { RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { collection, doc, getDoc, getDocs, setDoc, Timestamp, type Firestore } from 'firebase/firestore'
import { closeItems, readdItems, reopenEntry, returnItem, undoClose } from '../../src/data/history'
import { addItem, toggleItem, updateItem, type Actor } from '../../src/data/items'
import { withId, type HistoryEntryDoc, type ItemDoc } from '../../src/data/types'
import { asUser, getTestEnv, seed } from './setup'

let env: RulesTestEnvironment

const ana: Actor = { uid: 'alice', name: 'Ana Prueba' }
const OLD = Timestamp.fromMillis(Date.UTC(2026, 0, 15))

async function items(db: Firestore): Promise<ItemDoc[]> {
  const snap = await getDocs(collection(db, 'lists/shared/items').withConverter(withId<ItemDoc>()))
  return snap.docs.map((d) => d.data())
}

async function addDone(db: Firestore, kind: 'buy' | 'do', name: string): Promise<ItemDoc> {
  const id = await addItem(db, 'shared', ana, { kind, name, storeName: kind === 'buy' ? 'Super' : undefined })
  const item = (await items(db)).find((i) => i.id === id)!
  await toggleItem(db, 'shared', item, ana)
  return (await items(db)).find((i) => i.id === id)!
}

beforeAll(async () => {
  env = await getTestEnv()
})
beforeEach(async () => {
  await env.clearFirestore()
  await seed(async (db) => {
    await setDoc(doc(db, 'lists/shared'), { name: 'Despensa', ownerId: 'alice', memberIds: ['alice', 'bob'], members: {} })
    await setDoc(doc(db, 'lists/shared/products/leche'), { name: 'Leche', timesPurchased: 3, lastPurchasedAt: OLD })
  })
})
afterAll(() => env.cleanup())

test('closing a purchase moves the done items to history and counts the purchase', async () => {
  const db = asUser('alice')
  const leche = await addDone(db, 'buy', 'Leche')
  const pan = await addDone(db, 'buy', 'Pan')
  await addItem(db, 'shared', ana, { kind: 'buy', name: 'Huevo' })

  const result = await closeItems(db, 'shared', ana, 'buy', [leche, pan])
  await result!.written
  const entry = (await getDoc(doc(db, `lists/shared/history/${result!.entryId}`))).data()!
  expect(entry).toMatchObject({ kind: 'purchase', closedBy: 'alice', closedByName: 'Ana Prueba' })
  expect(entry.items.map((i: { name: string }) => i.name).sort()).toEqual(['Leche', 'Pan'])
  expect(entry.items.find((i: { name: string }) => i.name === 'Leche').prevLastPurchasedAt).toEqual(OLD)

  const after = await items(db)
  expect(after.filter((i) => i.status === 'closed').map((i) => i.historyId)).toEqual([result!.entryId, result!.entryId])
  expect(after.find((i) => i.name === 'Huevo')!.status).toBe('pending')

  const product = (await getDoc(doc(db, 'lists/shared/products/leche'))).data()!
  expect(product.timesPurchased).toBe(4)
  expect(product.lastPurchasedAt).toEqual(entry.closedAt)
  expect((await getDoc(doc(db, 'lists/shared/products/pan'))).data()!.timesPurchased).toBe(1)
})

test('undoClose brings the items back as done and reverts the products', async () => {
  const db = asUser('alice')
  const leche = await addDone(db, 'buy', 'Leche')
  const result = await closeItems(db, 'shared', ana, 'buy', [leche])
  await result!.written

  await undoClose(db, 'shared', result!.entryId)
  expect((await getDoc(doc(db, `lists/shared/history/${result!.entryId}`))).exists()).toBe(false)
  const back = (await items(db)).find((i) => i.id === leche.id)!
  expect(back.status).toBe('done')
  expect(back).not.toHaveProperty('historyId')
  const product = (await getDoc(doc(db, 'lists/shared/products/leche'))).data()!
  expect(product.timesPurchased).toBe(3)
  expect(product.lastPurchasedAt).toEqual(OLD)
})

test('undo keeps a newer purchase date set by a later close', async () => {
  const db = asUser('alice')
  const first = await closeItems(db, 'shared', ana, 'buy', [await addDone(db, 'buy', 'Leche')])
  await first!.written
  const second = await closeItems(db, 'shared', ana, 'buy', [await addDone(db, 'buy', 'Leche')])
  await second!.written
  const secondAt = (await getDoc(doc(db, `lists/shared/history/${second!.entryId}`))).data()!.closedAt

  await undoClose(db, 'shared', first!.entryId)
  const product = (await getDoc(doc(db, 'lists/shared/products/leche'))).data()!
  expect(product.timesPurchased).toBe(4)
  expect(product.lastPurchasedAt).toEqual(secondAt)
})

test('closing nothing returns null and writes nothing', async () => {
  const db = asUser('alice')
  expect(await closeItems(db, 'shared', ana, 'buy', [])).toBeNull()
  expect((await getDocs(collection(db, 'lists/shared/history'))).size).toBe(0)
})

test('archiving Hacer items creates an archive entry and leaves products alone', async () => {
  const db = asUser('alice')
  const task = await addDone(db, 'do', 'Leche')
  const result = await closeItems(db, 'shared', ana, 'do', [task])
  await result!.written
  expect((await getDoc(doc(db, `lists/shared/history/${result!.entryId}`))).data()!.kind).toBe('archive')
  expect((await getDoc(doc(db, 'lists/shared/products/leche'))).data()!.timesPurchased).toBe(3)
})

test('only done items of the given kind are closed', async () => {
  const db = asUser('alice')
  const leche = await addDone(db, 'buy', 'Leche')
  const pendingId = await addItem(db, 'shared', ana, { kind: 'buy', name: 'Pan' })
  const pending = (await items(db)).find((i) => i.id === pendingId)!
  const task = await addDone(db, 'do', 'Barrer')
  const result = await closeItems(db, 'shared', ana, 'buy', [leche, pending, task])
  await result!.written
  const entry = (await getDoc(doc(db, `lists/shared/history/${result!.entryId}`))).data()!
  expect(entry.items.map((i: { name: string }) => i.name)).toEqual(['Leche'])
})

test('more than 400 items is refused', async () => {
  const fake = Array.from({ length: 401 }, (_, n) => ({ id: `x${n}`, kind: 'buy', status: 'done', name: 'x' }) as ItemDoc)
  await expect(closeItems(asUser('alice'), 'shared', ana, 'buy', fake)).rejects.toThrow('too-many')
})

test('an edit landing on a closed item does not bring it back', async () => {
  const db = asUser('alice')
  const leche = await addDone(db, 'buy', 'Leche')
  const result = await closeItems(db, 'shared', ana, 'buy', [leche])
  await result!.written
  await updateItem(asUser('bob'), 'shared', leche.id, { quantity: '2' })
  const after = (await items(db)).find((i) => i.id === leche.id)!
  expect(after).toMatchObject({ status: 'closed', quantity: '2' })
})

describe('history actions', () => {
  async function closedEntry(db: Firestore, names: string[]): Promise<HistoryEntryDoc> {
    const done = []
    for (const name of names) done.push(await addDone(db, 'buy', name))
    const result = await closeItems(db, 'shared', ana, 'buy', done)
    await result!.written
    const snap = await getDoc(doc(db, `lists/shared/history/${result!.entryId}`).withConverter(withId<HistoryEntryDoc>()))
    return snap.data()!
  }
  const idOf = (entry: HistoryEntryDoc, name: string) => entry.items.find((i) => i.name === name)!.itemId

  test('readdItems adds pending copies and leaves the entry intact', async () => {
    const db = asUser('alice')
    const entry = await closedEntry(db, ['Leche', 'Pan'])
    const result = readdItems(db, 'shared', ana, entry, [idOf(entry, 'Leche'), idOf(entry, 'Pan')], await items(db))
    await result.written
    expect(result.added).toEqual(['Leche', 'Pan'])
    expect(result.duplicates).toEqual([])
    const pending = (await items(db)).filter((i) => i.status === 'pending').map((i) => i.name).sort()
    expect(pending).toEqual(['Leche', 'Pan'])
    expect((await getDoc(doc(db, `lists/shared/history/${entry.id}`))).data()!.items).toHaveLength(2)
  })

  test('readdItems skips what is already pending', async () => {
    const db = asUser('alice')
    const entry = await closedEntry(db, ['Leche', 'Pan'])
    await addItem(db, 'shared', ana, { kind: 'buy', name: 'leche' })
    const result = readdItems(db, 'shared', ana, entry, [idOf(entry, 'Leche'), idOf(entry, 'Pan')], await items(db))
    await result.written
    expect(result.added).toEqual(['Pan'])
    expect(result.duplicates).toEqual(['Leche'])
    expect((await items(db)).filter((i) => i.status === 'pending')).toHaveLength(2)
  })

  test('returnItem takes one item out of the entry and back to pending', async () => {
    const db = asUser('alice')
    const entry = await closedEntry(db, ['Leche', 'Pan'])
    const result = await returnItem(db, 'shared', entry, idOf(entry, 'Leche'), await items(db))
    await result.written
    expect(result.duplicateOf).toBeNull()
    const back = (await items(db)).find((i) => i.id === idOf(entry, 'Leche'))!
    expect(back.status).toBe('pending')
    expect(back).not.toHaveProperty('historyId')
    expect(back).not.toHaveProperty('doneBy')
    const left = (await getDoc(doc(db, `lists/shared/history/${entry.id}`))).data()!
    expect(left.items.map((i: { name: string }) => i.name)).toEqual(['Pan'])
    expect((await getDoc(doc(db, 'lists/shared/products/leche'))).data()!.timesPurchased).toBe(3)
  })

  test('returning the last item deletes the entry', async () => {
    const db = asUser('alice')
    const entry = await closedEntry(db, ['Pan'])
    await (await returnItem(db, 'shared', entry, idOf(entry, 'Pan'), await items(db))).written
    expect((await getDoc(doc(db, `lists/shared/history/${entry.id}`))).exists()).toBe(false)
  })

  test('returning something already pending deletes the closed copy and points to the pending one', async () => {
    const db = asUser('alice')
    const entry = await closedEntry(db, ['Leche'])
    const pendingId = await addItem(db, 'shared', ana, { kind: 'buy', name: 'Leche' })
    const result = await returnItem(db, 'shared', entry, idOf(entry, 'Leche'), await items(db))
    await result.written
    expect(result.duplicateOf).toBe(pendingId)
    expect((await getDoc(doc(db, `lists/shared/items/${idOf(entry, 'Leche')}`))).exists()).toBe(false)
  })

  test('reopenEntry brings every item back as done', async () => {
    const db = asUser('alice')
    const entry = await closedEntry(db, ['Leche', 'Pan'])
    await reopenEntry(db, 'shared', entry.id)
    const all = await items(db)
    expect(all.map((i) => i.status)).toEqual(['done', 'done'])
    expect((await getDoc(doc(db, `lists/shared/history/${entry.id}`))).exists()).toBe(false)
  })
})

test('closeItems uses the products the screen already has instead of reading them', async () => {
  const db = asUser('alice')
  const leche = await addDone(db, 'buy', 'Leche')
  const known = [{ id: 'leche', name: 'Leche', timesPurchased: 3, lastPurchasedAt: Timestamp.fromMillis(Date.UTC(2026, 1, 1)) }]
  const result = await closeItems(db, 'shared', ana, 'buy', [leche], known)
  await result!.written
  const entry = (await getDoc(doc(db, `lists/shared/history/${result!.entryId}`))).data()!
  expect(entry.items[0].prevLastPurchasedAt).toEqual(known[0].lastPurchasedAt)
})

test('closing the same stale items twice (double tap) closes them only once', async () => {
  const db = asUser('alice')
  const leche = await addDone(db, 'buy', 'Leche')
  const first = await closeItems(db, 'shared', ana, 'buy', [leche])
  const second = await closeItems(db, 'shared', ana, 'buy', [leche])
  await first!.written
  expect(second).toBeNull()
  expect((await getDocs(collection(db, 'lists/shared/history'))).size).toBe(1)
  expect((await getDoc(doc(db, 'lists/shared/products/leche'))).data()!.timesPurchased).toBe(4)
})
