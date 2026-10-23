import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'
import type { CategoryDoc } from './types'

type CategoryInput = Pick<CategoryDoc, 'name' | 'icon' | 'color'>

/** Crea la categoría al final del orden actual. */
export async function createCategory(db: Firestore, uid: string, input: CategoryInput): Promise<string> {
  const existing = await getDocs(collection(db, 'users', uid, 'categories'))
  const order = Math.max(-1, ...existing.docs.map((d) => d.data().order as number)) + 1
  const ref = doc(collection(db, 'users', uid, 'categories'))
  await setDoc(ref, { ...input, order })
  return ref.id
}

export function updateCategory(
  db: Firestore,
  uid: string,
  id: string,
  patch: Partial<CategoryInput>,
): Promise<void> {
  return updateDoc(doc(db, 'users', uid, 'categories', id), patch)
}

/** Borra la categoría; sus listas pasan a "Sin categoría". */
export async function deleteCategory(db: Firestore, uid: string, id: string): Promise<void> {
  const prefs = await getDocs(query(collection(db, 'users', uid, 'listPrefs'), where('categoryId', '==', id)))
  const batch = writeBatch(db)
  for (const p of prefs.docs) batch.update(p.ref, { categoryId: null })
  batch.delete(doc(db, 'users', uid, 'categories', id))
  await batch.commit()
}

export async function reorderCategories(db: Firestore, uid: string, orderedIds: string[]): Promise<void> {
  const batch = writeBatch(db)
  orderedIds.forEach((id, order) => batch.update(doc(db, 'users', uid, 'categories', id), { order }))
  await batch.commit()
}

