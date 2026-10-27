import type { RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { collection, doc, getDoc, getDocs, setDoc, Timestamp, type Firestore } from 'firebase/firestore'
import {
  createInvite,
  getInviteStatus,
  joinList,
  leaveList,
  removeMember,
  revokeInvite,
} from '../../src/data/sharing'
import { withId, type ListDoc } from '../../src/data/types'
import { asUser, getTestEnv, seed } from './setup'

let env: RulesTestEnvironment

const ana = { uid: 'alice', displayName: 'Ana Prueba', photoURL: null }
const caro = { uid: 'carol', displayName: 'Caro Prueba', photoURL: null }
const dani = { uid: 'dave', displayName: 'Dani Prueba', photoURL: null }
const DAY = 24 * 60 * 60 * 1000

async function list(db: Firestore): Promise<ListDoc> {
  return (await getDoc(doc(db, 'lists/shared').withConverter(withId<ListDoc>()))).data()!
}

beforeAll(async () => {
  env = await getTestEnv()
})
beforeEach(async () => {
  await env.clearFirestore()
  await seed(async (db) => {
    await setDoc(doc(db, 'lists/shared'), {
      name: 'Despensa',
      ownerId: 'alice',
      memberIds: ['alice'],
      members: { alice: { displayName: 'Ana Prueba', photoURL: null } },
    })
    await setDoc(doc(db, 'lists/shared/items/i1'), { kind: 'buy', name: 'Leche', status: 'pending' })
  })
})
afterAll(() => env.cleanup())

test('an invite lets carol see the list name and owner, then join', async () => {
  const alice = asUser('alice')
  const { token, url, written } = createInvite(alice, await list(alice), ana)
  await written
  expect(token).toMatch(/^[A-Za-z0-9_-]{32}$/)
  expect(url).toContain(`/join/shared/${token}`)

  const carol = asUser('carol')
  const status = await getInviteStatus(carol, 'carol', 'shared', token)
  expect(status.status).toBe('ok')
  expect(status.invite).toMatchObject({ listName: 'Despensa', ownerName: 'Ana Prueba' })

  await joinList(carol, caro, 'shared', token)
  expect((await getDoc(doc(carol, 'lists/shared/items/i1'))).exists()).toBe(true)
  expect((await getDoc(doc(carol, 'users/carol/listPrefs/shared'))).data()).toEqual({ categoryId: null, lastTab: 'buy' })
  expect((await list(carol)).members.carol).toEqual({ displayName: 'Caro Prueba', photoURL: null })
})

test('an invite works once', async () => {
  const alice = asUser('alice')
  const { token, written } = createInvite(alice, await list(alice), ana)
  await written
  await joinList(asUser('carol'), caro, 'shared', token)
  await expect(joinList(asUser('dave'), dani, 'shared', token)).rejects.toThrow()
  expect((await getInviteStatus(asUser('dave'), 'dave', 'shared', token)).status).toBe('used')
})

test('a revoked invite reports revoked', async () => {
  const alice = asUser('alice')
  const { token, written } = createInvite(alice, await list(alice), ana)
  await written
  await revokeInvite(alice, 'shared', token)
  expect((await getInviteStatus(asUser('carol'), 'carol', 'shared', token)).status).toBe('revoked')
})

test('an expired invite reports expired', async () => {
  await seed((db) =>
    setDoc(doc(db, 'lists/shared/invites/viejo'), {
      createdBy: 'alice',
      createdAt: Timestamp.fromMillis(Date.now() - 8 * DAY),
      expiresAt: Timestamp.fromMillis(Date.now() - DAY),
      listName: 'Despensa',
      ownerName: 'Ana Prueba',
      ownerPhotoURL: null,
    }),
  )
  expect((await getInviteStatus(asUser('carol'), 'carol', 'shared', 'viejo')).status).toBe('expired')
})

test('a random token reports not-found', async () => {
  expect((await getInviteStatus(asUser('carol'), 'carol', 'shared', 'no-existe')).status).toBe('not-found')
})

test('the owner opening the link reports already-member', async () => {
  const alice = asUser('alice')
  const { token, written } = createInvite(alice, await list(alice), ana)
  await written
  expect((await getInviteStatus(alice, 'alice', 'shared', token)).status).toBe('already-member')
})

test('removeMember takes carol out', async () => {
  const alice = asUser('alice')
  const { token, written } = createInvite(alice, await list(alice), ana)
  await written
  await joinList(asUser('carol'), caro, 'shared', token)
  await removeMember(alice, 'shared', 'carol')
  await expect(getDoc(doc(asUser('carol'), 'lists/shared/items/i1'))).rejects.toThrow()
  const after = await list(alice)
  expect(after.memberIds).toEqual(['alice'])
  expect(after.members).not.toHaveProperty('carol')
})

test('leaveList takes carol out and cleans her prefs and last list', async () => {
  const alice = asUser('alice')
  const { token, written } = createInvite(alice, await list(alice), ana)
  await written
  const carol = asUser('carol')
  await joinList(carol, caro, 'shared', token)
  await setDoc(doc(carol, 'users/carol'), { displayName: 'Caro Prueba', lastListId: 'shared' })
  await leaveList(carol, 'carol', 'shared', 'Caro Prueba')
  expect((await getDoc(doc(carol, 'users/carol/listPrefs/shared'))).exists()).toBe(false)
  expect((await getDoc(doc(carol, 'users/carol'))).data()!.lastListId).toBeNull()
  expect((await list(alice)).memberIds).toEqual(['alice'])
})

test('the owner can list her pending invites', async () => {
  const alice = asUser('alice')
  await createInvite(alice, await list(alice), ana).written
  expect((await getDocs(collection(alice, 'lists/shared/invites'))).size).toBe(1)
})
