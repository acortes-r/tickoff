import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { asUser, getTestEnv } from './setup'

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await getTestEnv()
})
beforeEach(() => env.clearFirestore())
afterAll(() => env.cleanup())

test('alice reads and writes her own data', async () => {
  const db = asUser('alice')
  await assertSucceeds(setDoc(doc(db, 'users/alice'), { displayName: 'Ana Prueba' }))
  await assertSucceeds(setDoc(doc(db, 'users/alice/stores/s1'), { name: 'Super' }))
  await assertSucceeds(getDoc(doc(db, 'users/alice/stores/s1')))
})

test("bob cannot read or write alice's data", async () => {
  const db = asUser('bob')
  await assertFails(getDoc(doc(db, 'users/alice/stores/s1')))
  await assertFails(setDoc(doc(db, 'users/alice/stores/s1'), { name: 'Otro' }))
  await assertFails(getDoc(doc(db, 'users/alice')))
})
