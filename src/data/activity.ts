import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
  type WriteBatch,
} from 'firebase/firestore'
import type { ActivityType } from './types'

const KEEP_DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000
const BATCH_LIMIT = 450

export interface ActivityEntry {
  type: ActivityType
  itemName?: string
  count?: number
  historyId?: string
}

/**
 * Agrega un aviso a la bitácora de la lista en el mismo batch que el cambio que
 * lo origina. Devuelve su id (el cierre lo guarda para borrarlo al deshacer).
 */
export function logActivity(
  batch: WriteBatch,
  db: Firestore,
  listId: string,
  actor: { uid: string; name: string },
  entry: ActivityEntry,
): string {
  const ref = doc(collection(db, 'lists', listId, 'activity'))
  const data: Record<string, unknown> = {
    type: entry.type,
    actorUid: actor.uid,
    actorName: actor.name,
    at: serverTimestamp(),
  }
  if (entry.itemName !== undefined) data.itemName = entry.itemName
  if (entry.count !== undefined) data.count = entry.count
  if (entry.historyId !== undefined) data.historyId = entry.historyId
  batch.set(ref, data)
  return ref.id
}

/** Sin servidor que limpie: al abrir una lista se borran sus avisos de más de 30 días. */
export async function pruneActivity(db: Firestore, listId: string): Promise<number> {
  const cutoff = Timestamp.fromMillis(Date.now() - KEEP_DAYS * DAY_MS)
  const old = (await getDocs(query(collection(db, 'lists', listId, 'activity'), where('at', '<', cutoff)))).docs
  for (let i = 0; i < old.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db)
    for (const d of old.slice(i, i + BATCH_LIMIT)) batch.delete(d.ref)
    await batch.commit()
  }
  return old.length
}

/** Abrir la campana marca todos los avisos como leídos. */
export function markNotificationsRead(db: Firestore, uid: string): Promise<void> {
  return updateDoc(doc(db, 'users', uid), { notificationsReadAt: serverTimestamp() })
}

/** Última vez que el usuario vio la lista: quita el punto en Inicio. */
export function markListSeen(db: Firestore, uid: string, listId: string): Promise<void> {
  return setDoc(doc(db, 'users', uid, 'listPrefs', listId), { lastSeenAt: serverTimestamp() }, { merge: true })
}
