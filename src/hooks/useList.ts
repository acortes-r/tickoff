import { doc, onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { withId, type ListDoc } from '@/data/types'
import { db } from '@/firebase'

/** La lista en vivo: undefined mientras carga, null si no existe o ya no hay acceso. */
export function useList(listId: string): ListDoc | null | undefined {
  const [state, setState] = useState<{ id: string; list: ListDoc | null } | null>(null)

  useEffect(
    () =>
      onSnapshot(
        doc(db, 'lists', listId).withConverter(withId<ListDoc>()),
        (snap) => setState({ id: listId, list: snap.data() ?? null }),
        () => setState({ id: listId, list: null }),
      ),
    [listId],
  )

  return state?.id === listId ? state.list : undefined
}
