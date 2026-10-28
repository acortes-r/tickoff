import { useEffect, useState } from 'react'
import { CloudOffIcon, Loader2Icon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useSyncState } from '@/hooks/useSyncState'

// Con señal, una escritura se confirma en milisegundos: "Guardando…" solo
// aparece si tarda más que esto, para que no parpadee en cada toque.
const PENDING_DELAY_MS = 1000

/** Indicador discreto de "sin conexión / cambios pendientes" (spec F10). */
export function SyncBadge() {
  const state = useSyncState()
  const [slowPending, setSlowPending] = useState(false)

  useEffect(() => {
    if (state !== 'pending') return
    const timer = setTimeout(() => setSlowPending(true), PENDING_DELAY_MS)
    return () => {
      clearTimeout(timer)
      setSlowPending(false)
    }
  }, [state])

  const label = state === 'offline' ? 'Sin conexión' : state === 'pending' && slowPending ? 'Guardando…' : null

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.5rem)] z-50 flex justify-center"
    >
      {label && (
        <Badge variant="secondary" className="h-6 border-border px-2.5">
          {state === 'offline' ? (
            <CloudOffIcon data-icon="inline-start" />
          ) : (
            <Loader2Icon className="animate-spin" data-icon="inline-start" />
          )}
          {label}
        </Badge>
      )}
    </div>
  )
}
