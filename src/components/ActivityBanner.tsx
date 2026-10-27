import { useEffect, useState } from 'react'
import { BellIcon, XIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import type { ListPrefsDoc } from '@/data/types'
import { describeSummary, openSummary, type ListSummary } from '@/domain/activity'
import { useActivity } from '@/hooks/useActivity'
import { useAuth } from '@/hooks/useAuth'
import { useListPrefsState } from '@/hooks/useListPrefs'

const SHOWN_KEY = 'tickoff.bannerShown'
const MAX_LINES = 2

/**
 * Aviso al abrir la app: qué cambiaron otros desde la última vez que viste
 * cada lista. Se calcula una sola vez por sesión, con los datos de ese momento.
 */
export function ActivityBanner() {
  const { user } = useAuth()
  const uid = user!.uid
  const { entries, ready } = useActivity()
  const { prefs, loaded } = useListPrefsState(uid)
  const [startPrefs, setStartPrefs] = useState<Record<string, ListPrefsDoc> | null>(null)
  const [summaries, setSummaries] = useState<ListSummary[] | null>(null)

  // Las fechas de "última vez vista" se toman en cuanto cargan: abrir una lista
  // después las cambia y el aviso ya no contaría lo nuevo.
  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    if (loaded && !startPrefs) setStartPrefs(prefs)
  }, [loaded, startPrefs, prefs])

  useEffect(() => {
    if (summaries || !ready || !startPrefs || sessionStorage.getItem(SHOWN_KEY)) return
    sessionStorage.setItem(SHOWN_KEY, '1')
    // Se calcula una vez por sesión.
    // eslint-disable-next-line react/set-state-in-effect
    setSummaries(openSummary(entries, uid, startPrefs))
  }, [summaries, ready, startPrefs, entries, uid])

  if (!summaries || summaries.length === 0) return null

  return (
    <div className="mx-auto max-w-[480px] px-4 pt-4">
      <Alert role="status">
        <BellIcon />
        <AlertTitle>Cambios desde tu última visita</AlertTitle>
        <AlertDescription>
          {summaries.length > MAX_LINES ? (
            <p>{summaries.length} listas con cambios</p>
          ) : (
            summaries.map((s) => <p key={s.listId}>{describeSummary(s)}</p>)
          )}
        </AlertDescription>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Cerrar aviso"
          className="absolute top-1.5 right-1.5"
          onClick={() => setSummaries([])}
        >
          <XIcon />
        </Button>
      </Alert>
    </div>
  )
}
