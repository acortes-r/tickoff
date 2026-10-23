import { onAuthStateChanged, type User } from 'firebase/auth'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { prepareUser } from '@/data/users'
import { auth, db } from '@/firebase'

interface AuthState {
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthState>({ user: null, loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true })

  useEffect(
    () =>
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          try {
            await prepareUser(db, {
              uid: user.uid,
              displayName: user.displayName ?? user.email ?? 'Sin nombre',
              photoURL: user.photoURL,
            })
          } catch (err) {
            console.error('No se pudo preparar el usuario', err)
          }
        }
        setState({ user, loading: false })
      }),
    [],
  )

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react/only-export-components
export function useAuth(): AuthState {
  return useContext(AuthContext)
}
