import type { RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, Timestamp, type Firestore } from 'firebase/firestore'
import { markListSeen, markNotificationsRead, pruneActivity } from '../../src/data/activity'
import { closeItems, reopenEntry, returnItem, undoClose } from '../../src/data/history'
import { addItem, deleteItem, toggleItem, updateItem, type Actor } from '../../src/data/items'
import { createInvite, joinList, leaveList } from '../../src/data/sharing'
import { withId, type ActivityDoc, type HistoryEntryDoc, type ItemDoc } from '../../src/data/types'
import { asUser, getTestEnv, seed } from './setup'

let env: RulesTestEnvironment

const beto: Actor = { uid: 'bob', name: 'Beto Prueba' }
const DAY = 24 * 60 * 60 * 1000

async function activity(db: Firestore): Promise<ActivityDoc[]> {
  const snap = await getDocs(collection(db, 'lists/shared/activity').withConverter(withId<ActivityDoc>()))
  return snap.docs.map((d) => d.data())
}

async function item(db: Firestore, id: string): Promise<ItemDoc> {
  return (await getDoc(doc(db, `lists/shared/items/${id}`).withConverter(withId<ItemDoc>()))).data()!
}

async function doneItem(db: Firestore, name: string): Promise<ItemDoc> {
  const id = await addItem(db, 'shared', beto, { kind: 'buy', name })
  await toggleItem(db, 'shared', await item(db, id), beto)
  return item(db, id)
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
      members: { alice: { displayName: 'Ana Prueba', photoURL: null }, bob: { displayName: 'Beto Prueba', photoURL: null } },
    }),
  )
})
afterAll(() => env.cleanup())

test('adding, ticking and deleting each leave one notice; editing and unticking leave none', async () => {
  const db = asUser('bob')
  const id = await addItem(db, 'shared', beto, { kind: 'buy', name: 'Leche' })
  await updateItem(db, 'shared', id, { quantity: '2' })
  await toggleItem(db, 'shared', await item(db, id), beto)
  await toggleItem(db, 'shared', await item(db, id), beto)
  await deleteItem(db, 'shared', await item(db, id), beto)
  const log = await activity(db)
  expect(log.map((a) => a.type).sort()).toEqual(['added', 'deleted', 'done'])
  expect(log.every((a) => a.actorUid === 'bob' && a.actorName === 'Beto Prueba' && a.itemName === 'Leche')).toBe(true)
})

test('closing three items leaves one notice with the count, linked both ways', async () => {
  const db = asUser('bob')
  const items = [await doneItem(db, 'Leche'), await doneItem(db, 'Pan'), await doneItem(db, 'Huevo')]
  const result = await closeItems(db, 'shared', beto, 'buy', items)
  await result!.written
  const closed = (await activity(db)).filter((a) => a.type === 'closed')
  expect(closed).toHaveLength(1)
  expect(closed[0]).toMatchObject({ count: 3, historyId: result!.entryId })
  const entry = (await getDoc(doc(db, `lists/shared/history/${result!.entryId}`))).data()!
  expect(entry.activityId).toBe(closed[0].id)
})

test('undoing a close removes its notice', async () => {
  const db = asUser('bob')
  const result = await closeItems(db, 'shared', beto, 'buy', [await doneItem(db, 'Leche')])
  await result!.written
  await undoClose(db, 'shared', result!.entryId)
  expect((await activity(db)).filter((a) => a.type === 'closed')).toEqual([])
})

test('returning the last item of a close removes its notice', async () => {
  const db = asUser('bob')
  const leche = await doneItem(db, 'Leche')
  const result = await closeItems(db, 'shared', beto, 'buy', [leche])
  await result!.written
  const entry = (await getDoc(doc(db, `lists/shared/history/${result!.entryId}`).withConverter(withId<HistoryEntryDoc>()))).data()!
  await (await returnItem(db, 'shared', entry, leche.id, [])).written
  expect((await activity(db)).filter((a) => a.type === 'closed')).toEqual([])
})

test('joining and leaving leave notices', async () => {
  const alice = asUser('alice')
  const { token, written } = createInvite(alice, { id: 'shared', name: 'Despensa' }, { uid: 'alice', displayName: 'Ana Prueba', photoURL: null })
  await written
  const carol = asUser('carol')
  await joinList(carol, { uid: 'carol', displayName: 'Caro Prueba', photoURL: null }, 'shared', token)
  await leaveList(carol, 'carol', 'shared', 'Caro Prueba')
  const types = (await activity(alice)).filter((a) => a.actorUid === 'carol').map((a) => a.type).sort()
  expect(types).toEqual(['joined', 'left'])
})

test('pruneActivity removes notices older than 30 days and keeps the rest', async () => {
  await seed(async (db) => {
    await setDoc(doc(db, 'lists/shared/activity/viejo'), { type: 'added', actorUid: 'bob', actorName: 'Beto Prueba', at: Timestamp.fromMillis(Date.now() - 31 * DAY) })
    await setDoc(doc(db, 'lists/shared/activity/nuevo'), { type: 'added', actorUid: 'bob', actorName: 'Beto Prueba', at: Timestamp.fromMillis(Date.now() - DAY) })
  })
  const db = asUser('bob')
  expect(await pruneActivity(db, 'shared')).toBe(1)
  expect((await activity(db)).map((a) => a.id)).toEqual(['nuevo'])
})

test('marking the bell read and the list seen store server dates', async () => {
  const db = asUser('alice')
  await setDoc(doc(db, 'users/alice'), { displayName: 'Ana Prueba' })
  await markNotificationsRead(db, 'alice')
  await markListSeen(db, 'alice', 'shared')
  expect((await getDoc(doc(db, 'users/alice'))).data()!.notificationsReadAt).toBeInstanceOf(Timestamp)
  expect((await getDoc(doc(db, 'users/alice/listPrefs/shared'))).data()!.lastSeenAt).toBeInstanceOf(Timestamp)
})

test('a member reopens an old purchase whose notice was already pruned', async () => {
  const bob = asUser('bob')
  const result = await closeItems(bob, 'shared', beto, 'buy', [await doneItem(bob, 'Leche')])
  await result!.written
  const entry = (await getDoc(doc(bob, `lists/shared/history/${result!.entryId}`).withConverter(withId<HistoryEntryDoc>()))).data()!
  await seed((s) => deleteDoc(doc(s, `lists/shared/activity/${entry.activityId}`)))
  await (await reopenEntry(bob, 'shared', entry, [])).written
  expect((await getDoc(doc(bob, `lists/shared/history/${entry.id}`))).exists()).toBe(false)
})
