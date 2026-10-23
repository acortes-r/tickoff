import { doc, onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { withId, type UserDoc } from '@/data/types'
import { db } from '@/firebase'
import { useAuth } from './useAuth'

/** Documento del usuario actual, en vivo. */
export function useUserDoc(): UserDoc | null {
  const { user } = useAuth()
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null)

  useEffect(() => {
    if (!user) return
    const ref = doc(db, 'users', user.uid).withConverter(withId<UserDoc>())
    return onSnapshot(ref, (snap) => setUserDoc(snap.data() ?? null))
  }, [user])

  // Al cerrar sesión no se muestra el documento del usuario anterior.
  return user && userDoc?.id === user.uid ? userDoc : null
}
