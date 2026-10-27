import {
  arrayRemove,
  arrayUnion,
  deleteField,
  doc,
  getDoc,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'
import { logActivity } from './activity'
import type { InviteDoc, ListDoc } from './types'

const TOKEN_LENGTH = 32
const INVITE_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

interface Person {
  uid: string
  displayName: string
  photoURL: string | null
}

export type InviteStatus = 'ok' | 'used' | 'expired' | 'revoked' | 'not-found' | 'already-member'

/** Token de 32 caracteres seguros para URL (64 símbolos: sin sesgo). */
function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_LENGTH))
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}

/**
 * Link de invitación de un solo uso que vence en 7 días. Copia el nombre de la
 * lista y del dueño para mostrarlos en "Unirse" sin dar acceso a la lista.
 */
export async function createInvite(
  db: Firestore,
  list: Pick<ListDoc, 'id' | 'name'>,
  owner: Person,
  origin: string = typeof location === 'undefined' ? '' : location.origin,
): Promise<{ token: string; url: string }> {
  const token = newToken()
  const now = Date.now()
  await setDoc(doc(db, 'lists', list.id, 'invites', token), {
    createdBy: owner.uid,
    createdAt: Timestamp.fromMillis(now),
    expiresAt: Timestamp.fromMillis(now + INVITE_DAYS * DAY_MS),
    listName: list.name,
    ownerName: owner.displayName,
    ownerPhotoURL: owner.photoURL,
  })
  return { token, url: `${origin}/join/${list.id}/${token}` }
}

/** Qué mostrar en la pantalla Unirse. Solo los miembros pueden leer la lista. */
export async function getInviteStatus(
  db: Firestore,
  _uid: string,
  listId: string,
  token: string,
): Promise<{ status: InviteStatus; invite?: InviteDoc }> {
  const member = await getDoc(doc(db, 'lists', listId))
    .then((s) => s.exists())
    .catch(() => false)
  if (member) return { status: 'already-member' }

  const snap = await getDoc(doc(db, 'lists', listId, 'invites', token))
  if (!snap.exists()) return { status: 'not-found' }
  const invite = { id: snap.id, ...snap.data() } as InviteDoc
  if (invite.usedBy) return { status: 'used', invite }
  if (invite.revoked) return { status: 'revoked', invite }
  if (invite.expiresAt.toMillis() <= Date.now()) return { status: 'expired', invite }
  return { status: 'ok', invite }
}

/** Usa la invitación y se agrega a la lista en un solo batch (así lo exigen las reglas). */
export async function joinList(db: Firestore, user: Person, listId: string, token: string): Promise<void> {
  const batch = writeBatch(db)
  batch.update(doc(db, 'lists', listId, 'invites', token), { usedBy: user.uid, usedAt: Timestamp.now() })
  batch.update(doc(db, 'lists', listId), {
    memberIds: arrayUnion(user.uid),
    [`members.${user.uid}`]: { displayName: user.displayName, photoURL: user.photoURL },
    joinToken: token,
  })
  batch.set(doc(db, 'users', user.uid, 'listPrefs', listId), { categoryId: null, lastTab: 'buy' })
  logActivity(batch, db, listId, { uid: user.uid, name: user.displayName }, { type: 'joined' })
  await batch.commit()
}

export function revokeInvite(db: Firestore, listId: string, token: string): Promise<void> {
  return updateDoc(doc(db, 'lists', listId, 'invites', token), { revoked: true })
}

/** Solo el dueño: saca a un miembro de la lista. */
export function removeMember(db: Firestore, listId: string, uid: string): Promise<void> {
  return updateDoc(doc(db, 'lists', listId), { memberIds: arrayRemove(uid), [`members.${uid}`]: deleteField() })
}

/** Un miembro sale de una lista compartida: deja de verla y se limpian sus preferencias. */
export async function leaveList(db: Firestore, uid: string, listId: string, name: string): Promise<void> {
  const user = await getDoc(doc(db, 'users', uid)).catch(() => null)
  const batch = writeBatch(db)
  batch.update(doc(db, 'lists', listId), { memberIds: arrayRemove(uid), [`members.${uid}`]: deleteField() })
  batch.delete(doc(db, 'users', uid, 'listPrefs', listId))
  if (user?.get('lastListId') === listId) batch.update(doc(db, 'users', uid), { lastListId: null })
  logActivity(batch, db, listId, { uid, name }, { type: 'left' })
  await batch.commit()
}
