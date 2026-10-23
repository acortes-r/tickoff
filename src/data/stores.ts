import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Firestore,
} from 'firebase/firestore'

export async function createStore(db: Firestore, uid: string, name: string): Promise<string> {
  const ref = doc(collection(db, 'users', uid, 'stores'))
  await setDoc(ref, { name, createdAt: serverTimestamp() })
  return ref.id
}

/** Solo cambia el catálogo: los productos guardan el nombre que tenían. */
export function renameStore(db: Firestore, uid: string, id: string, name: string): Promise<void> {
  return updateDoc(doc(db, 'users', uid, 'stores', id), { name })
}

/** La tienda default no se puede borrar: lanza Error("default-store"). */
export async function deleteStore(db: Firestore, uid: string, id: string): Promise<void> {
  const user = await getDoc(doc(db, 'users', uid))
  if (user.data()?.defaultStoreId === id) throw new Error('default-store')
  await deleteDoc(doc(db, 'users', uid, 'stores', id))
}

export function setDefaultStore(db: Firestore, uid: string, id: string): Promise<void> {
  return updateDoc(doc(db, 'users', uid), { defaultStoreId: id })
}
