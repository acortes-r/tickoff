import { getDocFromCache, type Firestore } from 'firebase/firestore'
import { prepareUser } from './users'

vi.mock('firebase/firestore', async (importOriginal) => ({
  ...(await importOriginal<typeof import('firebase/firestore')>()),
  doc: vi.fn(() => ({})),
  getDocFromCache: vi.fn(),
}))

const db = {} as Firestore
const user = { uid: 'alice', displayName: 'Ana Prueba', photoURL: null }

test('skips setup when the profile is already cached (works offline)', async () => {
  vi.mocked(getDocFromCache).mockResolvedValueOnce({ exists: () => true } as never)
  const setup = vi.fn()
  await prepareUser(db, user, setup)
  expect(setup).not.toHaveBeenCalled()
})

test('runs setup when the profile is not cached', async () => {
  vi.mocked(getDocFromCache).mockRejectedValueOnce(new Error('unavailable'))
  const setup = vi.fn().mockResolvedValue({ created: true })
  await prepareUser(db, user, setup)
  expect(setup).toHaveBeenCalledWith(db, user)
})
