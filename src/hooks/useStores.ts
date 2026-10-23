import { collection, orderBy, query } from 'firebase/firestore'
import { withId, type StoreDoc } from '@/data/types'
import { db } from '@/firebase'
import { useQueryData } from './useQueryData'
import { useUserDoc } from './useUserDoc'

/** Catálogo personal de tiendas y cuál es la default. */
export function useStores(uid: string | null): { stores: StoreDoc[]; defaultStoreId: string | null } {
  const userDoc = useUserDoc()
  const stores =
    useQueryData(uid && `stores:${uid}`, () =>
      query(collection(db, 'users', uid!, 'stores'), orderBy('name')).withConverter(withId<StoreDoc>()),
    ) ?? []
  return { stores, defaultStoreId: userDoc?.defaultStoreId ?? null }
}
