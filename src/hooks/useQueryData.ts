import { onSnapshot, type Query } from 'firebase/firestore'
import { useEffect, useState } from 'react'

/**
 * Resultados en vivo de una consulta. Devuelve null mientras carga o si no hay
 * consulta. `key` identifica la consulta: al cambiar, no se muestran datos viejos.
 */
export function useQueryData<T>(key: string | null, makeQuery: () => Query<T>): T[] | null {
  const [state, setState] = useState<{ key: string; data: T[] } | null>(null)

  useEffect(() => {
    if (!key) return
    return onSnapshot(makeQuery(), (snap) => setState({ key, data: snap.docs.map((d) => d.data()) }))
    // makeQuery depende solo de lo que ya va en key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return state && state.key === key ? state.data : null
}
