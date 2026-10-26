import type { RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { collection, doc, getDoc, getDocs, setDoc, Timestamp, type Firestore } from 'firebase/firestore'
import { closeItems, undoClose } from '../../src/data/history'
import { addItem, toggleItem, updateItem, type Actor } from '../../src/data/items'
import { withId, type ItemDoc } from '../../src/data/types'
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
