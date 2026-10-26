import { collection, orderBy, query } from 'firebase/firestore'
import { withId, type HistoryEntryDoc } from '@/data/types'
import { db } from '@/firebase'
import { useQueryData } from './useQueryData'

/** Registros del historial de la lista, más reciente primero; null mientras carga. */
export function useHistory(listId: string): HistoryEntryDoc[] | null {
  return useQueryData(`history:${listId}`, () =>
    query(collection(db, 'lists', listId, 'history'), orderBy('closedAt', 'desc')).withConverter(
      withId<HistoryEntryDoc>(),
    ),
  )
}
