import {
  collection,
  doc,
  getDocFromCache,
  runTransaction,
  serverTimestamp,
  updateDoc,
  type Firestore,
} from 'firebase/firestore'

interface NewUser {
  uid: string
  displayName: string
  photoURL: string | null
}

// Datos de ejemplo del primer login; el usuario puede renombrarlos o borrarlos.
const SEED_CATEGORIES = [
  { name: 'Despensa', icon: 'shopping-basket', color: 'tone-2' },
  { name: 'Trabajo', icon: 'briefcase', color: 'tone-6' },
  { name: 'Jardín', icon: 'sprout', color: 'tone-4' },
  { name: 'Mascotas', icon: 'paw-print', color: 'tone-7' },
]

/**
 * Crea el usuario y sus datos de ejemplo la primera vez. Dentro de una
 * transacción, así dos dispositivos o una recarga a medias nunca siembran dos veces.
 */
export async function ensureUserSetup(db: Firestore, user: NewUser): Promise<{ created: boolean }> {
  const userRef = doc(db, 'users', user.uid)
  return runTransaction(db, async (tx) => {
    if ((await tx.get(userRef)).exists()) return { created: false }

    const categoryIds = SEED_CATEGORIES.map((category, order) => {
      const ref = doc(collection(db, 'users', user.uid, 'categories'))
      tx.set(ref, { ...category, order })
      return ref.id
    })

    const storeRef = doc(collection(db, 'users', user.uid, 'stores'))
    tx.set(storeRef, { name: 'Super', createdAt: serverTimestamp() })

    const listRef = doc(collection(db, 'lists'))
    tx.set(listRef, {
      name: 'Despensa',
      ownerId: user.uid,
      memberIds: [user.uid],
      members: { [user.uid]: { displayName: user.displayName, photoURL: user.photoURL } },
      createdAt: serverTimestamp(),
    })
    tx.set(doc(db, 'users', user.uid, 'listPrefs', listRef.id), {
      categoryId: categoryIds[0],
      lastTab: 'buy',
    })

    tx.set(userRef, {
      displayName: user.displayName,
      photoURL: user.photoURL,
      defaultStoreId: storeRef.id,
      lastListId: listRef.id,
      createdAt: serverTimestamp(),
    })
    return { created: true }
  })
}

/**
 * Lo que corre al iniciar sesión. Si el perfil ya está en la caché local no hace
 * nada: las transacciones no funcionan sin señal y la app debe abrir igual.
 */
export async function prepareUser(
  db: Firestore,
  user: NewUser,
  setup: typeof ensureUserSetup = ensureUserSetup,
): Promise<void> {
  const cached = await getDocFromCache(doc(db, 'users', user.uid)).catch(() => null)
  if (cached?.exists()) return
  await setup(db, user)
}

export function setLastListId(db: Firestore, uid: string, listId: string | null): Promise<void> {
  return updateDoc(doc(db, 'users', uid), { lastListId: listId })
}
