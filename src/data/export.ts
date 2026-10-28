import { collection, getDocs, query, Timestamp, where, type Firestore } from 'firebase/firestore'
import { toCsv } from '@/domain/csv'
import {
  withId,
  type CategoryDoc,
  type HistoryEntryDoc,
  type ItemDoc,
  type ListDoc,
  type StoreDoc,
} from './types'

/** El mismo documento con sus fechas como texto ISO (legible fuera de la app). */
export type Serialized<T> = T extends Timestamp
  ? string
  : T extends (infer U)[]
    ? Serialized<U>[]
    : T extends object
      ? { [K in keyof T]: Serialized<T[K]> }
      : T

export interface ExportData {
  exportedAt: string
  categories: Serialized<CategoryDoc>[]
  stores: Serialized<StoreDoc>[]
  lists: Serialized<ListDoc & { items: ItemDoc[]; history: HistoryEntryDoc[] }>[]
}

function serialize<T>(value: T): Serialized<T> {
  if (value instanceof Timestamp) return value.toDate().toISOString() as Serialized<T>
  if (Array.isArray(value)) return value.map(serialize) as Serialized<T>
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, serialize(v)])) as Serialized<T>
  }
  return value as Serialized<T>
}

async function all<T extends { id: string }>(db: Firestore, path: string): Promise<T[]> {
  const snap = await getDocs(collection(db, path).withConverter(withId<T>()))
  return snap.docs.map((d) => d.data())
}

/** Todo lo del usuario: sus categorías y tiendas, y cada lista donde es miembro con elementos e historial. */
export async function collectExport(db: Firestore, uid: string): Promise<ExportData> {
  const [categories, stores, listSnap] = await Promise.all([
    all<CategoryDoc>(db, `users/${uid}/categories`),
    all<StoreDoc>(db, `users/${uid}/stores`),
    getDocs(query(collection(db, 'lists'), where('memberIds', 'array-contains', uid)).withConverter(withId<ListDoc>())),
  ])
  const lists = await Promise.all(
    listSnap.docs.map(async (d) => {
      const list = d.data()
      const [items, history] = await Promise.all([
        all<ItemDoc>(db, `lists/${list.id}/items`),
        all<HistoryEntryDoc>(db, `lists/${list.id}/history`),
      ])
      return { ...list, items, history }
    }),
  )
  return serialize({
    exportedAt: new Date().toISOString(),
    categories: categories.sort((a, b) => a.order - b.order),
    stores: stores.sort((a, b) => a.name.localeCompare(b.name, 'es')),
    lists: lists.sort((a, b) => a.name.localeCompare(b.name, 'es')),
  })
}

const TAB = { buy: 'Comprar', do: 'Hacer' } as const
const STATUS = { pending: 'Pendiente', done: 'Hecho', closed: 'Cerrado' } as const
const HISTORY_KIND = { purchase: 'Compra', archive: 'Hechos archivados' } as const

export function itemsCsv(data: ExportData): string {
  const headers = ['lista', 'pestaña', 'nombre', 'cantidad', 'tienda', 'nota', 'estado', 'agregó', 'completó', 'creado']
  const rows = data.lists.flatMap((list) =>
    list.items.map((item) => [
      list.name,
      TAB[item.kind],
      item.name,
      item.quantity ?? null,
      item.storeName ?? null,
      item.note ?? null,
      STATUS[item.status],
      item.addedByName,
      item.doneByName ?? null,
      item.createdAt ?? null,
    ]),
  )
  return toCsv(headers, rows)
}

export function historyCsv(data: ExportData): string {
  const headers = ['lista', 'tipo', 'cerrado', 'cerró', 'nombre', 'cantidad', 'tienda', 'nota']
  const rows = data.lists.flatMap((list) =>
    list.history.flatMap((entry) =>
      entry.items.map((item) => [
        list.name,
        HISTORY_KIND[entry.kind],
        entry.closedAt,
        entry.closedByName,
        item.name,
        item.quantity ?? null,
        item.storeName ?? null,
        item.note ?? null,
      ]),
    ),
  )
  return toCsv(headers, rows)
}
