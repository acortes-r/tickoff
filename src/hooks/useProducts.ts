import { collection } from 'firebase/firestore'
import { withId, type ProductDoc } from '@/data/types'
import { db } from '@/firebase'
import { useQueryData } from './useQueryData'

/** Productos ya usados en la lista: autocompletado y tienda sugerida. */
export function useProducts(listId: string): ProductDoc[] {
  return (
    useQueryData(`products:${listId}`, () =>
      collection(db, 'lists', listId, 'products').withConverter(withId<ProductDoc>()),
    ) ?? []
  )
}
