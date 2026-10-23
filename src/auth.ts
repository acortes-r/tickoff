import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type Auth,
} from 'firebase/auth'

// En una PWA instalada en iOS el popup suele estar bloqueado: se usa redirect.
const REDIRECT_CODES = ['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment']

export async function signIn(auth: Auth): Promise<void> {
  const provider = new GoogleAuthProvider()
  try {
    await signInWithPopup(auth, provider)
  } catch (err) {
    const code = (err as { code?: string }).code
    if (code && REDIRECT_CODES.includes(code)) {
      await signInWithRedirect(auth, provider)
      return
    }
    throw err
  }
}

export function signOutUser(auth: Auth): Promise<void> {
  return signOut(auth)
}
