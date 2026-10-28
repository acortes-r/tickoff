import { useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import { showSaveError } from '@/lib/saveError'

export type SyncState = 'online' | 'offline' | 'pending'

// Listeners en vivo que tienen escrituras locales sin confirmar por el servidor.
const pendingSources = new Set<object>()
const subscribers = new Set<() => void>()

function notify() {
  for (const fn of subscribers) fn()
}

function subscribe(fn: () => void) {
  subscribers.add(fn)
  window.addEventListener('online', fn)
  window.addEventListener('offline', fn)
  return () => {
    subscribers.delete(fn)
    window.removeEventListener('online', fn)
    window.removeEventListener('offline', fn)
  }
}

function snapshot(): SyncState {
  if (!navigator.onLine) return 'offline'
  return pendingSources.size > 0 ? 'pending' : 'online'
}

/**
 * Un listener informa si sus documentos tienen escrituras pendientes
 * (`metadata.hasPendingWrites`). `clear` al cerrarlo.
 */
export function createPendingReporter() {
  const source = {}
  return {
    set(pending: boolean) {
      const had = pendingSources.has(source)
      if (pending) pendingSources.add(source)
      else pendingSources.delete(source)
      if (had !== pending) notify()
    },
    clear() {
      if (pendingSources.delete(source)) notify()
    },
  }
}

/** "offline" sin red; "pending" con cambios sin subir; si no, "online". */
export function useSyncState(): SyncState {
  return useSyncExternalStore(subscribe, snapshot)
}

const ACCESS_ERROR_EVERY_MS = 10_000
let lastAccessError = -Infinity

/**
 * Para escrituras que se lanzan sin esperar. Si el servidor las rechaza porque
 * ya no hay acceso (te sacaron de la lista sin señal), lo dice una sola vez
 * aunque fallen varias; Firestore ya las revirtió en pantalla.
 */
export function reportWriteError(err: unknown): void {
  if ((err as { code?: string } | null)?.code !== 'permission-denied') {
    showSaveError(err)
    return
  }
  console.error(err)
  const now = Date.now()
  if (now - lastAccessError < ACCESS_ERROR_EVERY_MS) return
  lastAccessError = now
  toast.error('Algunos cambios no se guardaron porque ya no tienes acceso a esta lista')
}
