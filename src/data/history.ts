import {
  collection,
  deleteField,
  doc,
  getDoc,
  increment,
  serverTimestamp,
  Timestamp,
  writeBatch,
  type Firestore,
  type WriteBatch,
} from 'firebase/firestore'
import { normalizeName, productDocId } from '@/domain/text'
import { defined, type Actor } from './items'
import type { HistoryEntryDoc, HistoryItem, ItemDoc, ItemKind } from './types'

const MAX_CLOSE = 400

function productRef(db: Firestore, listId: string, name: string) {
  return doc(db, 'lists', listId, 'products', productDocId(normalizeName(name)))
}

async function readTimestamp(ref: ReturnType<typeof productRef>, field: string): Promise<Timestamp | null> {
  // Sin señal y sin caché la lectura falla: se asume que no había fecha.
  const snap = await getDoc(ref).catch(() => null)
  return (snap?.get(field) as Timestamp | undefined) ?? null
}

/**
 * Terminar compra (Comprar) o archivar hechos (Hacer): los tachados de esa
 * pestaña pasan a un registro del historial. Los elementos no se borran: quedan
 * `closed` con `historyId`, así una edición sin señal que llegue tarde no los revive.
 *
 * Devuelve el id del registro en cuanto la escritura está en camino (sirve sin
 * señal para ofrecer "Deshacer"); `written` se cumple cuando el servidor confirma.
 */
export async function closeItems(
  db: Firestore,
  listId: string,
  by: Actor,
  kind: ItemKind,
  items: ItemDoc[],
): Promise<{ entryId: string; written: Promise<void> } | null> {
  const toClose = items.filter((i) => i.kind === kind && i.status === 'done')
  if (toClose.length === 0) return null
  if (toClose.length > MAX_CLOSE) throw new Error('too-many')

  const closedAt = Timestamp.now()
  const entryRef = doc(collection(db, 'lists', listId, 'history'))

  // Fecha anterior de cada producto, para poder revertirla al deshacer.
  const prevByProduct = new Map<string, Timestamp | null>()
  if (kind === 'buy') {
    for (const item of toClose) {
      const ref = productRef(db, listId, item.name)
      if (!prevByProduct.has(ref.id)) prevByProduct.set(ref.id, await readTimestamp(ref, 'lastPurchasedAt'))
    }
  }

  const snapshot: HistoryItem[] = toClose.map((item) =>
    defined({
      itemId: item.id,
      kind: item.kind,
      name: item.name,
      quantity: item.quantity,
      storeName: item.storeName,
      note: item.note,
      addedByName: item.addedByName,
      doneByName: item.doneByName ?? by.name,
      prevLastPurchasedAt:
        kind === 'buy' ? (prevByProduct.get(productRef(db, listId, item.name).id) ?? null) : null,
    }) as HistoryItem,
  )

  const batch = writeBatch(db)
  batch.set(entryRef, {
    kind: kind === 'buy' ? 'purchase' : 'archive',
    closedAt,
    closedBy: by.uid,
    closedByName: by.name,
    items: snapshot,
  })
  for (const item of toClose) {
    batch.update(doc(db, 'lists', listId, 'items', item.id), {
      status: 'closed',
      historyId: entryRef.id,
      updatedAt: serverTimestamp(),
    })
    if (kind === 'buy') {
      batch.set(
        productRef(db, listId, item.name),
        { name: item.name, timesPurchased: increment(1), lastPurchasedAt: closedAt, lastStoreName: item.storeName ?? null },
        { merge: true },
      )
    }
  }
  return { entryId: entryRef.id, written: batch.commit() }
}

/**
 * Revierte en el batch lo que el cierre hizo a los productos: una compra menos
 * y, si nadie la cambió después, la fecha de última compra anterior.
 */
export async function revertProducts(
  batch: WriteBatch,
  db: Firestore,
  listId: string,
  entry: Pick<HistoryEntryDoc, 'closedAt'>,
  items: HistoryItem[],
): Promise<void> {
  const byProduct = new Map<string, { ref: ReturnType<typeof productRef>; count: number; prev: Timestamp | null }>()
  for (const item of items) {
    if (item.kind !== 'buy') continue
    const ref = productRef(db, listId, item.name)
    const current = byProduct.get(ref.id)
    byProduct.set(ref.id, { ref, count: (current?.count ?? 0) + 1, prev: item.prevLastPurchasedAt ?? null })
  }
  for (const { ref, count, prev } of byProduct.values()) {
    const last = await readTimestamp(ref, 'lastPurchasedAt')
    const changes: Record<string, unknown> = { timesPurchased: increment(-count) }
    if (last && last.isEqual(entry.closedAt)) changes.lastPurchasedAt = prev
    batch.update(ref, changes)
  }
}

/** Deshacer un cierre: los elementos vuelven como tachados y el registro se borra. */
export async function undoClose(db: Firestore, listId: string, entryId: string): Promise<void> {
  const entryRef = doc(db, 'lists', listId, 'history', entryId)
  const entry = (await getDoc(entryRef)).data() as Omit<HistoryEntryDoc, 'id'> | undefined
  if (!entry) return

  const batch = writeBatch(db)
  for (const item of entry.items) {
    batch.update(doc(db, 'lists', listId, 'items', item.itemId), {
      status: 'done',
      historyId: deleteField(),
      updatedAt: serverTimestamp(),
    })
  }
  await revertProducts(batch, db, listId, entry, entry.items)
  batch.delete(entryRef)
  await batch.commit()
}
