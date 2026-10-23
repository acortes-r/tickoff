import { collection, orderBy, query } from 'firebase/firestore'
import { withId, type CategoryDoc } from '@/data/types'
import { db } from '@/firebase'
import { useQueryData } from './useQueryData'

/** Categorías del usuario en su orden. */
export function useCategories(uid: string | null): CategoryDoc[] {
  return (
    useQueryData(uid && `categories:${uid}`, () =>
      query(collection(db, 'users', uid!, 'categories'), orderBy('order')).withConverter(withId<CategoryDoc>()),
    ) ?? []
  )
}
