import { onSnapshot, type Query } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { listenWithRetry } from '@/lib/retryListener'
import { createPendingReporter } from './useSyncState'

/**
 * Resultados en vivo de una consulta. Devuelve null mientras carga o si no hay
 * consulta. `key` identifica la consulta: al cambiar, no se muestran datos viejos.
 * Si el listener falla se reintenta; si sigue fallando (p. ej. ya no hay acceso
 * a la lista) devuelve []. Informa sus cambios sin subir al indicador de sincronización.
 */
export function useQueryData<T>(key: string | null, makeQuery: () => Query<T>): T[] | null {
  const [state, setState] = useState<{ key: string; data: T[] } | null>(null)

  useEffect(() => {
    if (!key) return
    const pending = createPendingReporter()
    const stop = listenWithRetry(
      (onError) =>
        onSnapshot(
          makeQuery(),
          { includeMetadataChanges: true },
          (snap) => {
            pending.set(snap.metadata.hasPendingWrites)
            setState({ key, data: snap.docs.map((d) => d.data()) })
          },
          onError,
        ),
      (err) => {
        console.error(`Falló la consulta ${key}`, err)
        pending.clear()
        setState({ key, data: [] })
      },
    )
    return () => {
      stop()
      pending.clear()
    }
    // makeQuery depende solo de lo que ya va en key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return state && state.key === key ? state.data : null
}
