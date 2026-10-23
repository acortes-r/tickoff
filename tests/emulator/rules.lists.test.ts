import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { deleteDoc, deleteField, doc, getDoc, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { asUser, getTestEnv, seed } from './setup'

let env: RulesTestEnvironment

const member = (displayName: string) => ({ displayName, photoURL: null })
const item = { kind: 'buy', name: 'Leche', normalizedName: 'leche', status: 'pending' }

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
      members: { alice: member('Ana Prueba'), bob: member('Beto Prueba') },
    }),
  )
})
afterAll(() => env.cleanup())

describe('create', () => {
  test('alice creates a list where she is the only member', async () => {
    await assertSucceeds(
      setDoc(doc(asUser('alice'), 'lists/new'), {
        name: 'Jardín',
        ownerId: 'alice',
        memberIds: ['alice'],
        members: { alice: member('Ana Prueba') },
      }),
    )
  })

  test('alice cannot create a list that already includes bob', async () => {
    await assertFails(
      setDoc(doc(asUser('alice'), 'lists/new'), {
        name: 'Jardín',
        ownerId: 'alice',
        memberIds: ['alice', 'bob'],
        members: {},
      }),
    )
  })
})

describe('read and items', () => {
  test('carol cannot read a list she is not in', async () => {
    await assertFails(getDoc(doc(asUser('carol'), 'lists/shared')))
  })

  test('member bob reads the list and writes an item', async () => {
    const db = asUser('bob')
    await assertSucceeds(getDoc(doc(db, 'lists/shared')))
    await assertSucceeds(setDoc(doc(db, 'lists/shared/items/i1'), item))
  })

  test('non-member carol cannot read items', async () => {
    await seed((db) => setDoc(doc(db, 'lists/shared/items/i1'), item))
    await assertFails(getDoc(doc(asUser('carol'), 'lists/shared/items/i1')))
  })

  test('item with an unknown kind is rejected', async () => {
    await assertFails(setDoc(doc(asUser('bob'), 'lists/shared/items/i1'), { ...item, kind: 'x' }))
  })

  test('item with an empty name is rejected', async () => {
    await assertFails(setDoc(doc(asUser('bob'), 'lists/shared/items/i1'), { ...item, name: '' }))
  })

  test('history and products are open to members only', async () => {
    await assertSucceeds(setDoc(doc(asUser('bob'), 'lists/shared/products/leche'), { name: 'Leche' }))
    await assertFails(getDoc(doc(asUser('carol'), 'lists/shared/products/leche')))
    await assertFails(setDoc(doc(asUser('carol'), 'lists/shared/history/h1'), { kind: 'purchase' }))
  })
})

describe('owner', () => {
  test('alice renames her list', async () => {
    await assertSucceeds(updateDoc(doc(asUser('alice'), 'lists/shared'), { name: 'Súper' }))
  })

  test('alice removes bob', async () => {
    await assertSucceeds(
      updateDoc(doc(asUser('alice'), 'lists/shared'), {
        memberIds: ['alice'],
        'members.bob': deleteField(),
      }),
    )
  })

  test('alice cannot remove herself', async () => {
    await assertFails(updateDoc(doc(asUser('alice'), 'lists/shared'), { memberIds: ['bob'] }))
  })

  test('alice cannot add carol directly', async () => {
    await assertFails(
      updateDoc(doc(asUser('alice'), 'lists/shared'), {
        memberIds: ['alice', 'bob', 'carol'],
        'members.carol': member('Caro Prueba'),
      }),
    )
  })

  test('alice cannot add carol to memberIds alone', async () => {
    await assertFails(
      updateDoc(doc(asUser('alice'), 'lists/shared'), { memberIds: ['alice', 'bob', 'carol'] }),
    )
  })

  test('alice deletes her list with its items and invites in one batch', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'lists/shared/items/i1'), item)
      await setDoc(doc(db, 'lists/shared/invites/t1'), { createdBy: 'alice' })
    })
    const db = asUser('alice')
    const batch = writeBatch(db)
    batch.delete(doc(db, 'lists/shared/items/i1'))
    batch.delete(doc(db, 'lists/shared/invites/t1'))
    batch.delete(doc(db, 'lists/shared'))
    await assertSucceeds(batch.commit())
  })

  test('alice cannot hand the list to bob', async () => {
    await assertFails(updateDoc(doc(asUser('alice'), 'lists/shared'), { ownerId: 'bob' }))
  })
})

describe('leaving', () => {
  test('bob removes only himself', async () => {
    await assertSucceeds(
      updateDoc(doc(asUser('bob'), 'lists/shared'), {
        memberIds: ['alice'],
        'members.bob': deleteField(),
      }),
    )
  })

  test('bob cannot remove alice', async () => {
    await assertFails(
      updateDoc(doc(asUser('bob'), 'lists/shared'), {
        memberIds: ['bob'],
        'members.alice': deleteField(),
      }),
    )
  })

  test('bob cannot leave and rename in the same update', async () => {
    await assertFails(
      updateDoc(doc(asUser('bob'), 'lists/shared'), {
        memberIds: ['alice'],
        'members.bob': deleteField(),
        name: 'Mía',
      }),
    )
  })

  test('bob cannot rename the list', async () => {
    await assertFails(updateDoc(doc(asUser('bob'), 'lists/shared'), { name: 'Mía' }))
  })

  test('bob cannot delete the list', async () => {
    await assertFails(deleteDoc(doc(asUser('bob'), 'lists/shared')))
  })
})
