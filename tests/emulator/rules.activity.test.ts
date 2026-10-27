import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import {
  arrayRemove,
  arrayUnion,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { asUser, getTestEnv, seed } from './setup'

let env: RulesTestEnvironment

const DAY = 24 * 60 * 60 * 1000
const member = (displayName: string) => ({ displayName, photoURL: null })
const entry = (actorUid: string, type = 'added') => ({ type, actorUid, actorName: 'Alguien', at: serverTimestamp(), itemName: 'Leche' })
const old = (days: number, extra: object = {}) => ({
  type: 'added',
  actorUid: 'bob',
  actorName: 'Beto Prueba',
  at: Timestamp.fromMillis(Date.now() - days * DAY),
  ...extra,
})

beforeAll(async () => {
  env = await getTestEnv()
})
beforeEach(async () => {
  await env.clearFirestore()
  const now = Date.now()
  await seed(async (db) => {
    await setDoc(doc(db, 'lists/shared'), {
      name: 'Despensa',
      ownerId: 'alice',
      memberIds: ['alice', 'bob'],
      members: { alice: member('Ana Prueba'), bob: member('Beto Prueba') },
    })
    await setDoc(doc(db, 'lists/shared/invites/fresh'), {
      createdBy: 'alice',
      createdAt: Timestamp.fromMillis(now),
      expiresAt: Timestamp.fromMillis(now + 7 * DAY),
    })
    await setDoc(doc(db, 'lists/shared/activity/old31'), old(31))
    await setDoc(doc(db, 'lists/shared/activity/new1'), old(1))
    await setDoc(doc(db, 'lists/shared/history/h1'), { kind: 'purchase', items: [] })
    await setDoc(doc(db, 'lists/shared/activity/closed1'), old(1, { type: 'closed', count: 2, historyId: 'h1' }))
  })
})
afterAll(() => env.cleanup())

test('member bob logs his own action', async () => {
  await assertSucceeds(setDoc(doc(asUser('bob'), 'lists/shared/activity/a1'), entry('bob')))
})

test('nobody logs an action as someone else', async () => {
  await assertFails(setDoc(doc(asUser('bob'), 'lists/shared/activity/a1'), entry('alice')))
})

test('a non-member cannot log', async () => {
  await assertFails(setDoc(doc(asUser('carol'), 'lists/shared/activity/a1'), entry('carol')))
})

test('unknown types and client-made dates are rejected', async () => {
  await assertFails(setDoc(doc(asUser('bob'), 'lists/shared/activity/a1'), entry('bob', 'hacked')))
  await assertFails(
    setDoc(doc(asUser('bob'), 'lists/shared/activity/a1'), { ...entry('bob'), at: Timestamp.fromMillis(Date.now() + DAY) }),
  )
})

test('carol logs "joined" in her join batch', async () => {
  const db = asUser('carol')
  const batch = writeBatch(db)
  batch.update(doc(db, 'lists/shared/invites/fresh'), { usedBy: 'carol', usedAt: Timestamp.now() })
  batch.update(doc(db, 'lists/shared'), {
    memberIds: arrayUnion('carol'),
    'members.carol': member('Caro Prueba'),
    joinToken: 'fresh',
  })
  batch.set(doc(db, 'lists/shared/activity/j1'), entry('carol', 'joined'))
  await assertSucceeds(batch.commit())
})

test('bob logs "left" in his leave batch', async () => {
  const db = asUser('bob')
  const batch = writeBatch(db)
  batch.update(doc(db, 'lists/shared'), { memberIds: arrayRemove('bob'), 'members.bob': deleteField() })
  batch.set(doc(db, 'lists/shared/activity/l1'), entry('bob', 'left'))
  await assertSucceeds(batch.commit())
})

test('activity is never edited', async () => {
  await assertFails(updateDoc(doc(asUser('bob'), 'lists/shared/activity/new1'), { itemName: 'Otra' }))
})

test('members prune entries older than 30 days only', async () => {
  await assertSucceeds(deleteDoc(doc(asUser('bob'), 'lists/shared/activity/old31')))
  await assertFails(deleteDoc(doc(asUser('bob'), 'lists/shared/activity/new1')))
})

test('the owner deletes any entry (deleting the list)', async () => {
  await assertSucceeds(deleteDoc(doc(asUser('alice'), 'lists/shared/activity/new1')))
})

test('a close notice goes only together with its history entry (undo)', async () => {
  const bob = asUser('bob')
  await assertFails(deleteDoc(doc(bob, 'lists/shared/activity/closed1')))
  const batch = writeBatch(bob)
  batch.delete(doc(bob, 'lists/shared/history/h1'))
  batch.delete(doc(bob, 'lists/shared/activity/closed1'))
  await assertSucceeds(batch.commit())
})

test('a non-member cannot read activity', async () => {
  await assertFails(getDoc(doc(asUser('carol'), 'lists/shared/activity/new1')))
  await assertSucceeds(getDoc(doc(asUser('bob'), 'lists/shared/activity/new1')))
})
