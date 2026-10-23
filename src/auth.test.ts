import { signInWithPopup, signInWithRedirect, type Auth } from 'firebase/auth'
import { signIn } from './auth'

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
  signInWithRedirect: vi.fn(),
  signOut: vi.fn(),
}))

const auth = {} as Auth

beforeEach(() => vi.clearAllMocks())

test.each(['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'])(
  'falls back to redirect on %s',
  async (code) => {
    vi.mocked(signInWithPopup).mockRejectedValueOnce({ code })
    await signIn(auth)
    expect(signInWithRedirect).toHaveBeenCalledOnce()
  },
)

test('rethrows other errors', async () => {
  vi.mocked(signInWithPopup).mockRejectedValueOnce({ code: 'auth/network-request-failed' })
  await expect(signIn(auth)).rejects.toMatchObject({ code: 'auth/network-request-failed' })
  expect(signInWithRedirect).not.toHaveBeenCalled()
})
