import type { ItemDoc, ItemKind, ProductDoc, StoreDoc } from '@/data/types'
import { normalizeName } from './text'

/** Lo visible de una pestaña: pendientes (más nuevo arriba) y luego tachados (último tachado arriba). */
export function sortItems(items: ItemDoc[]): ItemDoc[] {
  const pending = items.filter((i) => i.status === 'pending')
  const done = items.filter((i) => i.status === 'done')
  pending.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
  done.sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis())
  return [...pending, ...done]
}

/** Elemento pendiente con el mismo nombre en la misma pestaña; los tachados no cuentan. */
export function findDuplicate(items: ItemDoc[], kind: ItemKind, name: string): ItemDoc | null {
  const key = normalizeName(name)
  return items.find((i) => i.kind === kind && i.status === 'pending' && i.normalizedName === key) ?? null
}

/** Tienda sugerida: la de la última vez en esta lista, o la default de quien agrega. */
export function suggestStore(product: ProductDoc | undefined, defaultStoreName: string | null): string | null {
  return product?.lastStoreName || defaultStoreName
}

/** Tiendas para elegir: el catálogo propio y las que ya usa la lista, sin repetir. */
export function storeOptions(own: StoreDoc[], items: ItemDoc[]): string[] {
  const byKey = new Map<string, string>()
  const names = [...own.map((s) => s.name), ...items.filter((i) => i.kind === 'buy').map((i) => i.storeName)]
  for (const name of names) {
    if (!name) continue
    const key = normalizeName(name)
    if (!byKey.has(key)) byKey.set(key, name)
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b, 'es'))
}

export interface StoreChip {
  key: string
  label: string
}

/**
 * Chips del modo super: una por tienda distinta entre lo que está por comprar
 * (pendiente o tachado), sin distinguir mayúsculas ni acentos. La etiqueta es
 * la forma de escribirla que más se repite.
 */
export function storeChips(items: ItemDoc[]): StoreChip[] {
  const spellings = new Map<string, Map<string, number>>()
  for (const item of items) {
    if (item.kind !== 'buy' || item.status === 'closed' || !item.storeName) continue
    const key = normalizeName(item.storeName)
    const counts = spellings.get(key) ?? new Map<string, number>()
    counts.set(item.storeName, (counts.get(item.storeName) ?? 0) + 1)
    spellings.set(key, counts)
  }
  return [...spellings.entries()]
    .map(([key, counts]) => ({ key, label: [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0] }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'))
}

/** Elementos de la tienda elegida; null = todas. */
export function filterByStore(items: ItemDoc[], chipKey: string | null): ItemDoc[] {
  if (chipKey === null) return items
  return items.filter((i) => i.storeName && normalizeName(i.storeName) === chipKey)
}
