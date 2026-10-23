import { collection, query, where } from 'firebase/firestore'
import { withId, type ListDoc } from '@/data/types'
import { db } from '@/firebase'
import { useQueryData } from './useQueryData'

/** Listas donde el usuario es miembro (propias y compartidas); null mientras carga. */
export function useLists(uid: string | null): ListDoc[] | null {
  return useQueryData(uid && `lists:${uid}`, () =>
    query(collection(db, 'lists'), where('memberIds', 'array-contains', uid)).withConverter(withId<ListDoc>()),
  )
}
