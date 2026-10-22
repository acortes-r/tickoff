import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'
import { asUser, getTestEnv, seed } from './setup'

let env: RulesTestEnvironment

const DAY = 24 * 60 * 60 * 1000
const member = (displayName: string) => ({ displayName, photoURL: null })

function invite(createdAt: number, expiresAt: number, extra: object = {}) {
  return {
    createdBy: 'alice',
    createdAt: Timestamp.fromMillis(createdAt),
    expiresAt: Timestamp.fromMillis(expiresAt),
    listName: 'Despensa',
    ownerName: 'Ana Prueba',
    ownerPhotoURL: null,
    ...extra,
  }
}

/** Lo que hará joinList: usar la invitación y agregarse a la lista en un batch. */
function join(db: Firestore, uid: string, token: string, memberIds = ['alice', 'bob', uid]) {
  const batch = writeBatch(db)
  batch.update(doc(db, `lists/shared/invites/${token}`), { usedBy: uid, usedAt: Timestamp.now() })
  batch.update(doc(db, 'lists/shared'), {
    memberIds,
    [`members.${uid}`]: member('Caro Prueba'),
    joinToken: token,
  })
  return batch.commit()
}

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
    await setDoc(doc(db, 'lists/shared/invites/fresh'), invite(now, now + 7 * DAY))
    await setDoc(doc(db, 'lists/shared/invites/used'), invite(now, now + 7 * DAY, { usedBy: 'dave' }))
    await setDoc(doc(db, 'lists/shared/invites/revoked'), invite(now, now + 7 * DAY, { revoked: true }))
    await setDoc(doc(db, 'lists/shared/invites/expired'), invite(now - 8 * DAY, now - DAY))
  })
})
afterAll(() => env.cleanup())

describe('create', () => {
  test('alice creates an invite that expires in 7 days', async () => {
    const now = Date.now()
    await assertSucceeds(setDoc(doc(asUser('alice'), 'lists/shared/invites/t1'), invite(now, now + 7 * DAY)))
  })

  test('an invite that expires in 30 days is rejected', async () => {
    const now = Date.now()
    await assertFails(setDoc(doc(asUser('alice'), 'lists/shared/invites/t1'), invite(now, now + 30 * DAY)))
  })

  test('member bob cannot create an invite', async () => {
    const now = Date.now()
    await assertFails(
      setDoc(doc(asUser('bob'), 'lists/shared/invites/t1'), invite(now, now + 7 * DAY, { createdBy: 'bob' })),
    )
  })
})

describe('read', () => {
  test('carol gets an invite by its token', async () => {
    await assertSucceeds(getDoc(doc(asUser('carol'), 'lists/shared/invites/fresh')))
  })

  test('carol cannot list invites', async () => {
    await assertFails(getDocs(collection(asUser('carol'), 'lists/shared/invites')))
  })

  test('member bob cannot list invites', async () => {
    await assertFails(getDocs(collection(asUser('bob'), 'lists/shared/invites')))
  })

  test('member bob cannot revoke an invite', async () => {
    await assertFails(updateDoc(doc(asUser('bob'), 'lists/shared/invites/fresh'), { revoked: true }))
  })

  test('alice lists her invites and revokes one', async () => {
    const db = asUser('alice')
    await assertSucceeds(getDocs(collection(db, 'lists/shared/invites')))
    await assertSucceeds(updateDoc(doc(db, 'lists/shared/invites/fresh'), { revoked: true }))
  })
})

describe('join', () => {
  test('carol joins with a fresh invite', async () => {
    await assertSucceeds(join(asUser('carol'), 'carol', 'fresh'))
    await assertSucceeds(getDoc(doc(asUser('carol'), 'lists/shared')))
  })

  test.each(['used', 'revoked', 'expired'])('carol cannot join with a %s invite', async (token) => {
    await assertFails(join(asUser('carol'), 'carol', token))
  })

  test('carol cannot add herself without using the invite', async () => {
    await assertFails(
      updateDoc(doc(asUser('carol'), 'lists/shared'), {
        memberIds: ['alice', 'bob', 'carol'],
        'members.carol': member('Caro Prueba'),
        joinToken: 'fresh',
      }),
    )
  })

  test('carol cannot list herself twice', async () => {
    await assertFails(join(asUser('carol'), 'carol', 'fresh', ['alice', 'bob', 'carol', 'carol']))
  })

  test.each(['alice', 'bob'])('%s, already in the list, cannot run the join batch', async (uid) => {
    await assertFails(join(asUser(uid), uid, 'fresh', ['alice', 'bob']))
  })

  test('carol cannot join with a token that does not exist', async () => {
    await assertFails(join(asUser('carol'), 'carol', 'nope'))
  })

  test('carol cannot mark an invite used without joining', async () => {
    await assertFails(
      updateDoc(doc(asUser('carol'), 'lists/shared/invites/fresh'), { usedBy: 'carol', usedAt: Timestamp.now() }),
    )
  })

  test('using an invite cannot change its other fields', async () => {
    const db = asUser('carol')
    const batch = writeBatch(db)
    batch.update(doc(db, 'lists/shared/invites/fresh'), {
      usedBy: 'carol',
      usedAt: Timestamp.now(),
      listName: 'Otra',
    })
    batch.update(doc(db, 'lists/shared'), {
      memberIds: ['alice', 'bob', 'carol'],
      'members.carol': member('Caro Prueba'),
      joinToken: 'fresh',
    })
    await assertFails(batch.commit())
  })

  test('carol cannot add dave along with herself', async () => {
    await assertFails(join(asUser('carol'), 'carol', 'fresh', ['alice', 'bob', 'carol', 'dave']))
  })
})
