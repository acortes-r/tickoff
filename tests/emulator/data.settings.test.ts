import type { RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { collection, doc, getDoc, getDocs, orderBy, query, setDoc } from 'firebase/firestore'
import {
  createCategory,
  deleteCategory,
  reorderCategories,
  updateCategory,
} from '../../src/data/categories'
import { createStore, deleteStore, renameStore, setDefaultStore } from '../../src/data/stores'
import { asUser, getTestEnv } from './setup'

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await getTestEnv()
})
beforeEach(() => env.clearFirestore())
afterAll(() => env.cleanup())

describe('categories', () => {
  test('createCategory appends at the end and updateCategory patches it', async () => {
    const db = asUser('alice')
    const first = await createCategory(db, 'alice', { name: 'Casa', icon: 'house', color: 'tone-1' })
    const second = await createCategory(db, 'alice', { name: 'Auto', icon: 'car', color: 'tone-3' })
    await updateCategory(db, 'alice', second, { name: 'Coche' })
    const cats = await getDocs(query(collection(db, 'users/alice/categories'), orderBy('order')))
    expect(cats.docs.map((d) => [d.id, d.data().name, d.data().order])).toEqual([
      [first, 'Casa', 0],
      [second, 'Coche', 1],
    ])
  })

  test('deleting a category clears it from every listPrefs pointing to it', async () => {
    const db = asUser('alice')
    const casa = await createCategory(db, 'alice', { name: 'Casa', icon: 'house', color: 'tone-1' })
    await setDoc(doc(db, 'users/alice/listPrefs/l1'), { categoryId: casa, lastTab: 'buy' })
    await setDoc(doc(db, 'users/alice/listPrefs/l2'), { categoryId: casa, lastTab: 'do' })
    await setDoc(doc(db, 'users/alice/listPrefs/l3'), { categoryId: 'otra', lastTab: 'buy' })
    await deleteCategory(db, 'alice', casa)
    expect((await getDoc(doc(db, `users/alice/categories/${casa}`))).exists()).toBe(false)
    expect((await getDoc(doc(db, 'users/alice/listPrefs/l1'))).data()).toEqual({ categoryId: null, lastTab: 'buy' })
    expect((await getDoc(doc(db, 'users/alice/listPrefs/l2'))).data()).toEqual({ categoryId: null, lastTab: 'do' })
    expect((await getDoc(doc(db, 'users/alice/listPrefs/l3'))).data()!.categoryId).toBe('otra')
  })

  test('reorderCategories writes orders 0, 1, 2 in the given order', async () => {
    const db = asUser('alice')
    for (const id of ['c1', 'c2', 'c3']) {
      await setDoc(doc(db, `users/alice/categories/${id}`), { name: id, icon: 'tag', color: 'tone-1', order: 9 })
    }
    await reorderCategories(db, 'alice', ['c3', 'c1', 'c2'])
    const cats = await getDocs(query(collection(db, 'users/alice/categories'), orderBy('order')))
    expect(cats.docs.map((d) => [d.id, d.data().order])).toEqual([
      ['c3', 0],
      ['c1', 1],
      ['c2', 2],
    ])
  })
})

describe('stores', () => {
  async function setup() {
    const db = asUser('alice')
    const superId = await createStore(db, 'alice', 'Super')
    await setDoc(doc(db, 'users/alice'), { displayName: 'Ana Prueba', defaultStoreId: superId })
    return { db, superId }
  }

  test('deleting the default store throws default-store', async () => {
    const { db, superId } = await setup()
    await expect(deleteStore(db, 'alice', superId)).rejects.toThrow('default-store')
    expect((await getDoc(doc(db, `users/alice/stores/${superId}`))).exists()).toBe(true)
  })

  test('after setDefaultStore the old default can be deleted', async () => {
    const { db, superId } = await setup()
    const mercado = await createStore(db, 'alice', 'Mercado')
    await setDefaultStore(db, 'alice', mercado)
    await deleteStore(db, 'alice', superId)
    expect((await getDoc(doc(db, 'users/alice'))).data()!.defaultStoreId).toBe(mercado)
    expect((await getDoc(doc(db, `users/alice/stores/${superId}`))).exists()).toBe(false)
  })

  test('renameStore changes only the name', async () => {
    const { db, superId } = await setup()
    await renameStore(db, 'alice', superId, 'Súper del centro')
    expect((await getDoc(doc(db, `users/alice/stores/${superId}`))).data()!.name).toBe('Súper del centro')
  })
})
