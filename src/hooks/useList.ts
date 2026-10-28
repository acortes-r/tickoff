import { doc, onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { withId, type ListDoc } from '@/data/types'
import { db } from '@/firebase'
import { listenWithRetry } from '@/lib/retryListener'
import { createPendingReporter } from './useSyncState'

/** La lista en vivo: undefined mientras carga, null si no existe o ya no hay acceso. */
export function useList(listId: string): ListDoc | null | undefined {
  const [state, setState] = useState<{ id: string; list: ListDoc | null } | null>(null)

  useEffect(() => {
    const pending = createPendingReporter()
    const stop = listenWithRetry(
      (onError) =>
        onSnapshot(
          doc(db, 'lists', listId).withConverter(withId<ListDoc>()),
          { includeMetadataChanges: true },
          (snap) => {
            pending.set(snap.metadata.hasPendingWrites)
            setState({ id: listId, list: snap.data() ?? null })
          },
          onError,
        ),
      // Sin acceso (o ya no existe) después de reintentar.
      () => {
        pending.clear()
        setState({ id: listId, list: null })
      },
    )
    return () => {
      stop()
      pending.clear()
    }
  }, [listId])

  return state?.id === listId ? state.list : undefined
}
