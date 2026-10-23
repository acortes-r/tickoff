import type { CategoryDoc, ListDoc, ListPrefsDoc } from '@/data/types'

export interface ListGroup {
  /** null = "Sin categoría". */
  category: CategoryDoc | null
  lists: ListDoc[]
}

/**
 * Agrupa las listas por la categoría personal del usuario: categorías en su
 * orden y "Sin categoría" al final. Sin pref o con una categoría borrada, la
 * lista cae en "Sin categoría". Grupos vacíos no se muestran.
 */
export function groupListsByCategory(
  lists: ListDoc[],
  prefs: Record<string, ListPrefsDoc>,
  categories: CategoryDoc[],
): ListGroup[] {
  const byCategory = new Map<string | null, ListDoc[]>()
  const known = new Set(categories.map((c) => c.id))

  for (const list of lists) {
    const categoryId = prefs[list.id]?.categoryId ?? null
    const key = categoryId && known.has(categoryId) ? categoryId : null
    byCategory.set(key, [...(byCategory.get(key) ?? []), list])
  }

  const groups: ListGroup[] = [...categories]
    .sort((a, b) => a.order - b.order)
    .filter((c) => byCategory.has(c.id))
    .map((c) => ({ category: c, lists: byCategory.get(c.id)! }))

  const uncategorized = byCategory.get(null)
  if (uncategorized) groups.push({ category: null, lists: uncategorized })
  return groups
}
