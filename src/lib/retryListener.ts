import type { Unsubscribe } from 'firebase/firestore'

// Esperas entre reintentos. Un listener rechazado no se recupera solo, y el
// rechazo puede ser momentáneo: p. ej. una lista recién creada que el servidor
// todavía no recibe, o un miembro que se acaba de unir.
const RETRY_DELAYS_MS = [500, 1500, 4000]

/**
 * Abre un listener de Firestore y, si falla, lo reabre unas veces con espera.
 * Si se agotan los intentos llama a `onGiveUp`. Devuelve cómo cerrarlo.
 */
export function listenWithRetry(
  listen: (onError: (err: Error) => void) => Unsubscribe,
  onGiveUp: (err: Error) => void,
): Unsubscribe {
  let attempt = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let unsubscribe: Unsubscribe = () => {}
  let closed = false

  const open = () => {
    unsubscribe = listen((err) => {
      unsubscribe()
      if (closed) return
      const delay = RETRY_DELAYS_MS[attempt]
      attempt += 1
      if (delay === undefined) onGiveUp(err)
      else timer = setTimeout(open, delay)
    })
  }
  open()

  return () => {
    closed = true
    clearTimeout(timer)
    unsubscribe()
  }
}
