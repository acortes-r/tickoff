import type { RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { ensureUserSetup } from '../../src/data/users'
import { asUser, getTestEnv } from './setup'

let env: RulesTestEnvironment

const alice = { uid: 'alice', displayName: 'Ana Prueba', photoURL: null }

beforeAll(async () => {
  env = await getTestEnv()
})
beforeEach(() => env.clearFirestore())
afterAll(() => env.cleanup())

test('seeds once', async () => {
  const db = asUser('alice', 'Ana Prueba')
  await Promise.all([ensureUserSetup(db, alice), ensureUserSetup(db, alice)])
  const cats = await getDocs(collection(db, 'users/alice/categories'))
  expect(cats.docs.map((d) => d.data().name).sort()).toEqual(['Despensa', 'Jardín', 'Mascotas', 'Trabajo'])
  expect((await getDocs(collection(db, 'users/alice/stores'))).size).toBe(1)
  const lists = await getDocs(query(collection(db, 'lists'), where('memberIds', 'array-contains', 'alice')))
  expect(lists.docs.map((d) => d.data().name)).toEqual(['Despensa'])
  const user = (await getDoc(doc(db, 'users/alice'))).data()!
  expect(user.lastListId).toBe(lists.docs[0].id)
})

test('first run reports created, later runs do not', async () => {
  const db = asUser('alice', 'Ana Prueba')
  expect(await ensureUserSetup(db, alice)).toEqual({ created: true })
  expect(await ensureUserSetup(db, alice)).toEqual({ created: false })
})

test('default store is Super and the list sits in Despensa', async () => {
  const db = asUser('alice', 'Ana Prueba')
  await ensureUserSetup(db, alice)
  const user = (await getDoc(doc(db, 'users/alice'))).data()!
  const store = (await getDoc(doc(db, `users/alice/stores/${user.defaultStoreId}`))).data()!
  expect(store.name).toBe('Super')
  const prefs = (await getDoc(doc(db, `users/alice/listPrefs/${user.lastListId}`))).data()!
  const category = (await getDoc(doc(db, `users/alice/categories/${prefs.categoryId}`))).data()!
  expect(category.name).toBe('Despensa')
  expect(prefs.lastTab).toBe('buy')
  const list = (await getDoc(doc(db, `lists/${user.lastListId}`))).data()!
  expect(list).toMatchObject({ ownerId: 'alice', memberIds: ['alice'], members: { alice: { displayName: 'Ana Prueba', photoURL: null } } })
})
