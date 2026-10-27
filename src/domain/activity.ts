import type { ActivityDoc, ActivityType, ListPrefsDoc } from '@/data/types'

/** Un registro de actividad con la lista a la que pertenece. */
export type ListActivity = ActivityDoc & { listId: string; listName: string }

export interface ActivityGroup {
  listId: string
  listName: string
  actorName: string
  type: ActivityType
  count: number
  itemNames: string[]
  latestAt: Date
}

const GROUP_WINDOW_MS = 30 * 60 * 1000

/** Solo cuenta lo que hicieron otros, más reciente primero. */
function others(entries: ListActivity[], me: string): ListActivity[] {
  return entries.filter((e) => e.actorUid !== me).sort((a, b) => b.at.toMillis() - a.at.toMillis())
}

/**
 * Agrupa avisos para la campana: misma persona, misma acción, misma lista y a
 * menos de 30 min del aviso más reciente del grupo ("Ana agregó 5 elementos").
 */
export function groupActivity(entries: ListActivity[], me: string): ActivityGroup[] {
  const groups: ActivityGroup[] = []
  const open = new Map<string, ActivityGroup>()
  for (const e of others(entries, me)) {
    const key = `${e.listId}|${e.actorUid}|${e.type}`
    const at = e.at.toMillis()
    let group = open.get(key)
    if (!group || group.latestAt.getTime() - at > GROUP_WINDOW_MS) {
      group = { listId: e.listId, listName: e.listName, actorName: e.actorName, type: e.type, count: 0, itemNames: [], latestAt: new Date(at) }
      groups.push(group)
      open.set(key, group)
    }
    group.count += e.count ?? 1
    if (e.itemName) group.itemNames.push(e.itemName)
  }
  return groups.sort((a, b) => b.latestAt.getTime() - a.latestAt.getTime())
}

function seenAt(prefs: Record<string, ListPrefsDoc>, listId: string): number {
  return prefs[listId]?.lastSeenAt?.toMillis() ?? 0
}

/** Listas con actividad de otros posterior a la última vez que las abrí (punto en Inicio). */
export function unseenByList(entries: ListActivity[], me: string, prefs: Record<string, ListPrefsDoc>): Set<string> {
  return new Set(others(entries, me).filter((e) => e.at.toMillis() > seenAt(prefs, e.listId)).map((e) => e.listId))
}

/** Avisos de la campana que no he visto. */
export function unreadCount(entries: ListActivity[], me: string, readAt: Date | null): number {
  const since = readAt?.getTime() ?? 0
  return groupActivity(entries, me).filter((g) => g.latestAt.getTime() > since).length
}

export interface ListSummary {
  listId: string
  listName: string
  actorNames: string[]
  added: number
  done: number
}

/** Aviso al abrir la app: por cada lista con cambios de otros, quién y cuánto. */
export function openSummary(entries: ListActivity[], me: string, prefs: Record<string, ListPrefsDoc>): ListSummary[] {
  const byList = new Map<string, ListSummary>()
  for (const e of [...others(entries, me)].reverse()) {
    if (e.at.toMillis() <= seenAt(prefs, e.listId)) continue
    const summary = byList.get(e.listId) ?? { listId: e.listId, listName: e.listName, actorNames: [], added: 0, done: 0 }
    if (!summary.actorNames.includes(e.actorName)) summary.actorNames.push(e.actorName)
    if (e.type === 'added') summary.added += 1
    // Cerrar compra no suma: esos elementos ya contaron al tacharlos.
    if (e.type === 'done') summary.done += 1
    byList.set(e.listId, summary)
  }
  return [...byList.values()]
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** Texto de un aviso de la campana. */
export function describeGroup(g: ActivityGroup): string {
  const what = g.count === 1 && g.itemNames[0] ? g.itemNames[0] : plural(g.count, 'elemento', 'elementos')
  switch (g.type) {
    case 'added':
      return `${g.actorName} agregó ${what} a ${g.listName}`
    case 'done':
      return `${g.actorName} tachó ${what} en ${g.listName}`
    case 'deleted':
      return `${g.actorName} borró ${what} de ${g.listName}`
    case 'closed':
      return `${g.actorName} terminó una compra de ${plural(g.count, 'elemento', 'elementos')} en ${g.listName}`
    case 'archived':
      return `${g.actorName} archivó ${plural(g.count, 'hecho', 'hechos')} en ${g.listName}`
    case 'joined':
      return `${g.actorName} se unió a ${g.listName}`
    case 'left':
      return `${g.actorName} salió de ${g.listName}`
  }
}

/** Línea del aviso al abrir la app: "Ana actualizó Despensa: 3 agregados, 2 tachados". */
export function describeSummary(s: ListSummary): string {
  const who = s.actorNames.length > 1 ? `${s.actorNames.slice(0, -1).join(', ')} y ${s.actorNames.at(-1)}` : s.actorNames[0]
  const verb = s.actorNames.length > 1 ? 'actualizaron' : 'actualizó'
  const counts = [
    s.added ? plural(s.added, 'agregado', 'agregados') : null,
    s.done ? plural(s.done, 'tachado', 'tachados') : null,
  ].filter(Boolean)
  return `${who} ${verb} ${s.listName}${counts.length ? `: ${counts.join(', ')}` : ''}`
}
