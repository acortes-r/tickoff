import { collection, query, where } from 'firebase/firestore'
import { withId, type ItemDoc } from '@/data/types'
import { db } from '@/firebase'
import { useQueryData } from './useQueryData'

/** Elementos visibles de la lista (pendientes y tachados), en vivo. */
export function useItems(listId: string): ItemDoc[] {
  return (
    useQueryData(`items:${listId}`, () =>
      query(collection(db, 'lists', listId, 'items'), where('status', 'in', ['pending', 'done'])).withConverter(
        withId<ItemDoc>(),
      ),
    ) ?? []
  )
}
