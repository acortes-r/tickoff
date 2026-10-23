import type { RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { collection, disableNetwork, doc, getDoc, getDocsFromCache, setDoc } from 'firebase/firestore'
import { addItem, deleteItem, toggleItem, updateItem } from '../../src/data/items'
import { withId, type ItemDoc } from '../../src/data/types'
import { sortItems } from '../../src/domain/items'
import { asUser, getTestEnv, seed } from './setup'

let env: RulesTestEnvironment

const ana = { uid: 'alice', name: 'Ana Prueba' }
const beto = { uid: 'bob', name: 'Beto Prueba' }

async function read(listId: string, itemId: string): Promise<ItemDoc> {
  const snap = await getDoc(doc(asUser('alice'), `lists/${listId}/items/${itemId}`))
  return { id: snap.id, ...snap.data() } as ItemDoc
}

beforeAll(async () => {
  env = await getTestEnv()
})
beforeEach(async () => {
  await env.clearFirestore()
  await seed((db) =>
    setDoc(doc(db, 'lists/shared'), {
      name: 'Despensa',
      ownerId: 'alice',
      memberIds: ['alice', 'bob'],
      members: {},
    }),
  )
})
afterAll(() => env.cleanup())

test('addItem for Comprar creates the product with its store', async () => {
  const db = asUser('alice')
  const id = await addItem(db, 'shared', ana, { kind: 'buy', name: 'Jamón', quantity: '1/2 kg', storeName: 'Mercado' })
  expect(await read('shared', id)).toMatchObject({
    kind: 'buy',
    name: 'Jamón',
    normalizedName: 'jamon',
    quantity: '1/2 kg',
    storeName: 'Mercado',
    status: 'pending',
    addedBy: 'alice',
    addedByName: 'Ana Prueba',
  })
  const product = (await getDoc(doc(db, 'lists/shared/products/jamon'))).data()
  expect(product).toEqual({ name: 'Jamón', lastStoreName: 'Mercado', timesPurchased: 0 })
})

test('addItem does not reset how many times a product was bought', async () => {
  const db = asUser('alice')
  await seed((s) => setDoc(doc(s, 'lists/shared/products/leche'), { name: 'Leche', timesPurchased: 4 }))
  await addItem(db, 'shared', ana, { kind: 'buy', name: 'leche', storeName: 'Super' })
  const product = (await getDoc(doc(db, 'lists/shared/products/leche'))).data()!
  expect(product.timesPurchased).toBe(4)
  expect(product.lastStoreName).toBe('Super')
})

test('addItem for Hacer keeps the note and creates no product', async () => {
  const db = asUser('alice')
  const id = await addItem(db, 'shared', ana, { kind: 'do', name: 'Podar el pasto', note: 'Antes del sábado' })
  expect(await read('shared', id)).toMatchObject({ kind: 'do', note: 'Antes del sábado', status: 'pending' })
  expect((await getDoc(doc(db, 'lists/shared/products/podar el pasto'))).exists()).toBe(false)
})

test('two members editing different fields of the same item keep both changes', async () => {
  const id = await addItem(asUser('alice'), 'shared', ana, { kind: 'buy', name: 'Leche' })
  const item = await read('shared', id)
  await Promise.all([
    updateItem(asUser('bob'), 'shared', id, { quantity: '2' }),
    toggleItem(asUser('alice'), 'shared', item, ana),
  ])
  expect(await read('shared', id)).toMatchObject({ quantity: '2', status: 'done', doneBy: 'alice' })
})

test('toggling back to pending clears who completed it', async () => {
  const id = await addItem(asUser('alice'), 'shared', ana, { kind: 'do', name: 'Lavar el auto' })
  await toggleItem(asUser('bob'), 'shared', await read('shared', id), beto)
  expect(await read('shared', id)).toMatchObject({ status: 'done', doneBy: 'bob', doneByName: 'Beto Prueba' })
  await toggleItem(asUser('alice'), 'shared', await read('shared', id), ana)
  const after = await read('shared', id)
  expect(after.status).toBe('pending')
  expect(after).not.toHaveProperty('doneBy')
  expect(after).not.toHaveProperty('doneByName')
})

test('renaming recomputes normalizedName and moving tabs keeps the other fields', async () => {
  const id = await addItem(asUser('alice'), 'shared', ana, { kind: 'buy', name: 'Pintura', quantity: '1 l' })
  await updateItem(asUser('alice'), 'shared', id, { name: 'Pintar la barda', kind: 'do' })
  expect(await read('shared', id)).toMatchObject({
    kind: 'do',
    name: 'Pintar la barda',
    normalizedName: 'pintar la barda',
    quantity: '1 l',
  })
})

test('deleteItem removes it', async () => {
  const id = await addItem(asUser('alice'), 'shared', ana, { kind: 'buy', name: 'Pan' })
  await deleteItem(asUser('bob'), 'shared', id)
  expect((await getDoc(doc(asUser('alice'), `lists/shared/items/${id}`))).exists()).toBe(false)
})

test('items written without signal can be read and sorted before the server confirms them', async () => {
  const db = asUser('alice')
  await getDoc(doc(db, 'lists/shared'))
  await disableNetwork(db)
  void addItem(db, 'shared', ana, { kind: 'buy', name: 'Pan' })
  void addItem(db, 'shared', ana, { kind: 'buy', name: 'Leche' })
  const snap = await getDocsFromCache(collection(db, 'lists/shared/items').withConverter(withId<ItemDoc>()))
  const items = snap.docs.map((d) => d.data())
  expect(items).toHaveLength(2)
  expect(items.every((i) => i.createdAt && i.updatedAt)).toBe(true)
  expect(sortItems(items)).toHaveLength(2)
})
