import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'
import type { ItemKind, Member } from './types'

const BATCH_LIMIT = 450
const SUBCOLLECTIONS = ['items', 'history', 'products', 'invites', 'activity']

/**
 * Crea la lista. El id se conoce antes de escribir, así la app la abre de
 * inmediato aunque no haya señal; `written` se cumple cuando el servidor confirma.
 */
export function createList(
  db: Firestore,
  uid: string,
  member: Member,
  name: string,
  categoryId: string | null,
): { id: string; written: Promise<void> } {
  const listRef = doc(collection(db, 'lists'))
  const batch = writeBatch(db)
  batch.set(listRef, {
    name,
    ownerId: uid,
    memberIds: [uid],
    members: { [uid]: member },
    createdAt: serverTimestamp(),
  })
  batch.set(doc(db, 'users', uid, 'listPrefs', listRef.id), { categoryId, lastTab: 'buy' })
  return { id: listRef.id, written: batch.commit() }
}

export function renameList(db: Firestore, listId: string, name: string): Promise<void> {
  return updateDoc(doc(db, 'lists', listId), { name })
}

/** La categoría es personal: cada miembro elige la suya. */
export function setListCategory(
  db: Firestore,
  uid: string,
  listId: string,
  categoryId: string | null,
): Promise<void> {
  return setDoc(doc(db, 'users', uid, 'listPrefs', listId), { categoryId }, { merge: true })
}

export function setLastTab(db: Firestore, uid: string, listId: string, tab: ItemKind): Promise<void> {
  return setDoc(doc(db, 'users', uid, 'listPrefs', listId), { lastTab: tab }, { merge: true })
}

/**
 * Borra la lista para todos: primero sus subcolecciones en lotes, al final el
 * documento (las reglas de las subcolecciones lo leen para validar al dueño).
 */
export async function deleteListCascade(db: Firestore, listId: string): Promise<void> {
  for (const sub of SUBCOLLECTIONS) {
    const docs = (await getDocs(collection(db, 'lists', listId, sub))).docs
    for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
      const batch = writeBatch(db)
      for (const d of docs.slice(i, i + BATCH_LIMIT)) batch.delete(d.ref)
      await batch.commit()
    }
  }
  const batch = writeBatch(db)
  batch.delete(doc(db, 'lists', listId))
  await batch.commit()
}
