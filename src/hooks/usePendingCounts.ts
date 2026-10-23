import { collection, query, where } from 'firebase/firestore'
import { useMemo } from 'react'
import { withId, type ItemDoc, type ItemKind } from '@/data/types'
import { db } from '@/firebase'
import { useQueryData } from './useQueryData'

/** Pendientes por pestaña de una lista, en vivo. */
export function usePendingCounts(listId: string): Record<ItemKind, number> {
  const items = useQueryData(`pending:${listId}`, () =>
    query(collection(db, 'lists', listId, 'items'), where('status', '==', 'pending')).withConverter(
      withId<ItemDoc>(),
    ),
  )
  return useMemo(() => {
    const counts = { buy: 0, do: 0 }
    for (const item of items ?? []) counts[item.kind] += 1
    return counts
  }, [items])
}
