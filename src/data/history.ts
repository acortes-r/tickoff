import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocFromCache,
  increment,
  serverTimestamp,
  Timestamp,
  writeBatch,
  type Firestore,
  type WriteBatch,
} from 'firebase/firestore'
import { findDuplicate } from '@/domain/items'
import { normalizeName, productDocId } from '@/domain/text'
import { defined, queueAddItem, type Actor } from './items'
import type { HistoryEntryDoc, HistoryItem, ItemDoc, ItemKind, ProductDoc } from './types'

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
 * `known` son los productos que la pantalla ya escucha en vivo: con ellos no
 * hay que esperar al servidor (señal débil en el super). Los que falten se leen.
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
  known: ProductDoc[] = [],
): Promise<{ entryId: string; written: Promise<void> } | null> {
  const candidates = items.filter((i) => i.kind === kind && i.status === 'done')
  // La caché local ya refleja un cierre recién hecho (aun sin señal): si un doble
  // toque llega con la lista vieja, esos elementos ya no están tachados.
  const current = await Promise.all(
    candidates.map((i) => getDocFromCache(doc(db, 'lists', listId, 'items', i.id)).catch(() => null)),
  )
  const toClose = candidates.filter((_, n) => !current[n] || current[n]!.get('status') === 'done')
  if (toClose.length === 0) return null
  if (toClose.length > MAX_CLOSE) throw new Error('too-many')

  const closedAt = Timestamp.now()
  const entryRef = doc(collection(db, 'lists', listId, 'history'))

  // Fecha anterior de cada producto, para poder revertirla al deshacer.
  const prevByProduct = new Map<string, Timestamp | null>()
  if (kind === 'buy') {
    const refs = new Map(toClose.map((item) => [productRef(db, listId, item.name).id, productRef(db, listId, item.name)]))
    const knownById = new Map(known.map((p) => [p.id, p]))
    await Promise.all(
      [...refs].map(async ([id, ref]) => {
        const product = knownById.get(id)
        prevByProduct.set(id, product ? (product.lastPurchasedAt ?? null) : await readTimestamp(ref, 'lastPurchasedAt'))
      }),
    )
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

/** Reabrir un cierre completo desde el historial: igual que deshacerlo. */
export const reopenEntry = undoClose

/**
 * Volver a agregar: copia los elementos elegidos del registro como pendientes
 * (para comprarlos otra vez). El registro no cambia. Lo que ya está pendiente
 * no se duplica.
 */
export function readdItems(
  db: Firestore,
  listId: string,
  by: Actor,
  entry: HistoryEntryDoc,
  itemIds: string[],
  current: ItemDoc[],
): { added: string[]; duplicates: string[]; written: Promise<void> } {
  const added: string[] = []
  const duplicates: string[] = []
  const pending = [...current]
  const batch = writeBatch(db)
  for (const item of entry.items.filter((i) => itemIds.includes(i.itemId))) {
    if (findDuplicate(pending, item.kind, item.name)) {
      duplicates.push(item.name)
      continue
    }
    queueAddItem(batch, db, listId, by, {
      kind: item.kind,
      name: item.name,
      quantity: item.quantity,
      storeName: item.storeName,
      note: item.note,
    })
    added.push(item.name)
    // Que dos copias del mismo producto en el registro no se agreguen dos veces.
    pending.push({ kind: item.kind, status: 'pending', normalizedName: normalizeName(item.name) } as ItemDoc)
  }
  return { added, duplicates, written: added.length ? batch.commit() : Promise.resolve() }
}

/**
 * Regresar: corrige un error sacando un elemento del registro (si queda vacío
 * se borra) y devolviéndolo a la lista como pendiente. Si ya hay uno pendiente
 * igual, se borra la copia cerrada y se devuelve el id del existente.
 */
export async function returnItem(
  db: Firestore,
  listId: string,
  entry: HistoryEntryDoc,
  itemId: string,
  current: ItemDoc[],
): Promise<{ duplicateOf: string | null; written: Promise<void> }> {
  const item = entry.items.find((i) => i.itemId === itemId)
  if (!item) return { duplicateOf: null, written: Promise.resolve() }

  const batch = writeBatch(db)
  const entryRef = doc(db, 'lists', listId, 'history', entry.id)
  const rest = entry.items.filter((i) => i.itemId !== itemId)
  if (rest.length === 0) batch.delete(entryRef)
  else batch.update(entryRef, { items: rest })
  await revertProducts(batch, db, listId, entry, [item])

  const itemRef = doc(db, 'lists', listId, 'items', itemId)
  const duplicate = findDuplicate(current, item.kind, item.name)
  if (duplicate) {
    batch.delete(itemRef)
  } else {
    batch.update(itemRef, {
      status: 'pending',
      historyId: deleteField(),
      doneBy: deleteField(),
      doneByName: deleteField(),
      updatedAt: serverTimestamp(),
    })
  }
  return { duplicateOf: duplicate?.id ?? null, written: batch.commit() }
}
