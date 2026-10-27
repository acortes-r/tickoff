import {
  collection,
  deleteField,
  doc,
  increment,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type Firestore,
  type WriteBatch,
} from 'firebase/firestore'
import { cleanName, normalizeName, productDocId } from '@/domain/text'
import { logActivity } from './activity'
import type { ItemDoc, ItemKind } from './types'

export interface Actor {
  uid: string
  name: string
}

export interface NewItem {
  kind: ItemKind
  name: string
  quantity?: string
  storeName?: string | null
  note?: string
}

type ItemPatch = Partial<Pick<ItemDoc, 'name' | 'quantity' | 'storeName' | 'note' | 'kind'>>

function requireName(name: string): string {
  const clean = cleanName(name)
  if (!clean) throw new Error('invalid-name')
  return clean
}

/** Quita los campos sin valor: Firestore no acepta undefined. */
export function defined<T extends object>(data: T): Partial<T> {
  return Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) as Partial<T>
}

/**
 * Agrega al batch un elemento pendiente y devuelve su id. En Comprar también
 * registra el producto de la lista (autocompletar y tienda sugerida) sin tocar
 * cuántas veces se compró.
 */
export function queueAddItem(batch: WriteBatch, db: Firestore, listId: string, by: Actor, input: NewItem): string {
  const name = requireName(input.name)
  const normalizedName = normalizeName(name)
  const itemRef = doc(collection(db, 'lists', listId, 'items'))
  batch.set(
    itemRef,
    defined({
      kind: input.kind,
      name,
      normalizedName,
      quantity: input.quantity?.trim() || undefined,
      storeName: input.kind === 'buy' ? (input.storeName ?? null) : undefined,
      note: input.note?.trim() || undefined,
      status: 'pending',
      addedBy: by.uid,
      addedByName: by.name,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  )
  if (input.kind === 'buy') {
    batch.set(
      doc(db, 'lists', listId, 'products', productDocId(normalizedName)),
      { name, lastStoreName: input.storeName ?? null, timesPurchased: increment(0) },
      { merge: true },
    )
  }
  return itemRef.id
}

/** Agrega un elemento pendiente. */
export async function addItem(db: Firestore, listId: string, by: Actor, input: NewItem): Promise<string> {
  const batch = writeBatch(db)
  const id = queueAddItem(batch, db, listId, by, input)
  logActivity(batch, db, listId, by, { type: 'added', itemName: requireName(input.name) })
  await batch.commit()
  return id
}

/** Solo los campos que cambian: otro miembro puede estar editando otro campo. */
export function updateItem(db: Firestore, listId: string, itemId: string, patch: ItemPatch): Promise<void> {
  const changes: Record<string, unknown> = { ...defined(patch), updatedAt: serverTimestamp() }
  if (patch.name !== undefined) {
    changes.name = requireName(patch.name)
    changes.normalizedName = normalizeName(changes.name as string)
  }
  return updateDoc(doc(db, 'lists', listId, 'items', itemId), changes)
}

/** Tachar o destachar; guarda quién lo completó. Solo tachar deja aviso. */
export function toggleItem(db: Firestore, listId: string, item: ItemDoc, by: Actor): Promise<void> {
  const ref = doc(db, 'lists', listId, 'items', item.id)
  if (item.status !== 'pending') {
    return updateDoc(ref, { status: 'pending', doneBy: deleteField(), doneByName: deleteField(), updatedAt: serverTimestamp() })
  }
  const batch = writeBatch(db)
  batch.update(ref, { status: 'done', doneBy: by.uid, doneByName: by.name, updatedAt: serverTimestamp() })
  logActivity(batch, db, listId, by, { type: 'done', itemName: item.name })
  return batch.commit()
}

export function deleteItem(db: Firestore, listId: string, item: Pick<ItemDoc, 'id' | 'name'>, by: Actor): Promise<void> {
  const batch = writeBatch(db)
  batch.delete(doc(db, 'lists', listId, 'items', item.id))
  logActivity(batch, db, listId, by, { type: 'deleted', itemName: item.name })
  return batch.commit()
}
