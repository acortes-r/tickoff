// Claves de sessionStorage (duran lo que dura la pestaña o la app abierta).

/** Ya se decidió el arranque de esta sesión: Inicio no vuelve a saltar a la última lista. */
export const STARTED_KEY = 'tickoff.startedAt'

/** Link de invitación abierto sin sesión: se retoma después del login. */
export const PENDING_JOIN_KEY = 'tickoff.pendingJoin'

export function markStarted(): void {
  sessionStorage.setItem(STARTED_KEY, String(Date.now()))
}
