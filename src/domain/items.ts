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
