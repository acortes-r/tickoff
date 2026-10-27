import type { RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { collection, doc, getDoc, getDocs, setDoc, Timestamp, type Firestore } from 'firebase/firestore'
import {
  createList,
  deleteListCascade,
  renameList,
  setLastTab,
  setListCategory,
} from '../../src/data/lists'
import { setLastListId } from '../../src/data/users'
import { asUser, getTestEnv, seed } from './setup'

let env: RulesTestEnvironment

const ana = { displayName: 'Ana Prueba', photoURL: null }

/** Lee sin reglas: después de borrar la lista nadie puede leer lo que quede. */
async function countUnder(listId: string): Promise<number> {
  let total = 0
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore() as unknown as Firestore
    const list = await getDoc(doc(db, `lists/${listId}`))
    total += list.exists() ? 1 : 0
    for (const sub of ['items', 'history', 'products', 'invites', 'activity']) {
      total += (await getDocs(collection(db, `lists/${listId}/${sub}`))).size
    }
  })
  return total
}

beforeAll(async () => {
  env = await getTestEnv()
})
beforeEach(() => env.clearFirestore())
afterAll(() => env.cleanup())

test('createList makes the owner the only member and writes listPrefs', async () => {
  const db = asUser('alice')
  const { id, written } = createList(db, 'alice', ana, 'Jardín', 'cat-jardin')
  await written
  const list = (await getDoc(doc(db, `lists/${id}`))).data()!
  expect(list).toMatchObject({ name: 'Jardín', ownerId: 'alice', memberIds: ['alice'], members: { alice: ana } })
  const prefs = (await getDoc(doc(db, `users/alice/listPrefs/${id}`))).data()!
  expect(prefs).toEqual({ categoryId: 'cat-jardin', lastTab: 'buy' })
})

test('renameList, setListCategory, setLastTab and setLastListId update their fields', async () => {
  const db = asUser('alice')
  const { id, written } = createList(db, 'alice', ana, 'Jardín', 'cat-jardin')
  await written
  await renameList(db, id, 'Jardín de atrás')
  await setListCategory(db, 'alice', id, null)
  await setLastTab(db, 'alice', id, 'do')
  await setDoc(doc(db, 'users/alice'), { displayName: 'Ana Prueba' })
  await setLastListId(db, 'alice', id)
  expect((await getDoc(doc(db, `lists/${id}`))).data()!.name).toBe('Jardín de atrás')
  expect((await getDoc(doc(db, `users/alice/listPrefs/${id}`))).data()).toEqual({ categoryId: null, lastTab: 'do' })
  expect((await getDoc(doc(db, 'users/alice'))).data()!.lastListId).toBe(id)
})

test('deleteListCascade leaves nothing under the list', async () => {
  const db = asUser('alice')
  const { id, written } = createList(db, 'alice', ana, 'Despensa', null)
  await written
  await seed(async (s) => {
    for (const n of [1, 2, 3]) {
      await setDoc(doc(s, `lists/${id}/items/i${n}`), { kind: 'buy', name: `Cosa ${n}`, status: 'pending' })
    }
    await setDoc(doc(s, `lists/${id}/history/h1`), { kind: 'purchase', items: [] })
    await setDoc(doc(s, `lists/${id}/products/leche`), { name: 'Leche', timesPurchased: 1 })
    await setDoc(doc(s, `lists/${id}/invites/t1`), { createdBy: 'alice', expiresAt: Timestamp.now() })
    const day = 24 * 60 * 60 * 1000
    for (const [n, days] of [['a1', 1], ['a31', 31]] as const) {
      await setDoc(doc(s, `lists/${id}/activity/${n}`), { type: 'added', actorUid: 'alice', at: Timestamp.fromMillis(Date.now() - days * day) })
    }
  })
  expect(await countUnder(id)).toBe(9)
  await deleteListCascade(db, id)
  expect(await countUnder(id)).toBe(0)
})
