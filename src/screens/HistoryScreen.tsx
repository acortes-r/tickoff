import { useRef, useState } from 'react'
import { ChevronDownIcon, RotateCcwIcon, Undo2Icon } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { cn } from 'cn'
import { ScreenHeader } from '@/components/ScreenHeader'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { readdItems, reopenEntry, returnItem } from '@/data/history'
import type { Actor } from '@/data/items'
import type { HistoryEntryDoc, HistoryItem, ItemDoc } from '@/data/types'
import { findDuplicate } from '@/domain/items'
import { db } from '@/firebase'
import { useAuth } from '@/hooks/useAuth'
import { useHistory } from '@/hooks/useHistory'
import { useItems } from '@/hooks/useItems'
import { useList } from '@/hooks/useList'
import { useUserDoc } from '@/hooks/useUserDoc'
import { reportWriteError } from '@/hooks/useSyncState'

type Filter = 'all' | 'purchase' | 'archive'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Todo' },
  { value: 'purchase', label: 'Comprar' },
  { value: 'archive', label: 'Hacer' },
]

const dateFormat = new Intl.DateTimeFormat('es-MX', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

function itemDetail(item: HistoryItem): string {
  return item.kind === 'buy' ? [item.quantity, item.storeName].filter(Boolean).join(' · ') : (item.note ?? '')
}

function Entry({
  entry,
  current,
  by,
  onShowInList,
}: {
  entry: HistoryEntryDoc
  current: ItemDoc[]
  by: Actor
  onShowInList: (itemId: string) => void
}) {
  const { listId = '' } = useParams()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  // Acción en curso (id de elemento o "reopen"): evita dobles toques. El ref
  // cambia al instante; el estado deshabilita los botones.
  const busyRef = useRef(false)
  const [busy, setBusyState] = useState<string | null>(null)
  const setBusy = (value: string | null) => {
    busyRef.current = value !== null
    setBusyState(value)
  }
  const isPurchase = entry.kind === 'purchase'
  const count = entry.items.length

  function readd() {
    const result = readdItems(db, listId, by, entry, selected, current)
    result.written.catch(reportWriteError)
    setSelected([])
    if (result.added.length) toast(`${result.added.length} ${result.added.length === 1 ? 'agregado' : 'agregados'} a la lista`)
    for (const name of result.duplicates) {
      const existing = findDuplicate(current, entry.items.find((i) => i.name === name)!.kind, name)
      toast(`${name} ya está pendiente`, existing ? { action: { label: 'Ver', onClick: () => onShowInList(existing.id) } } : {})
    }
  }

  async function giveBack(item: HistoryItem) {
    if (busyRef.current) return
    setBusy(item.itemId)
    try {
      const result = await returnItem(db, listId, entry, item.itemId, current)
      result.written.catch(reportWriteError)
      if (result.duplicateOf) {
        const duplicateOf = result.duplicateOf
        toast(`${item.name} ya estaba pendiente`, { action: { label: 'Ver', onClick: () => onShowInList(duplicateOf) } })
      } else {
        toast(`${item.name} regresó a la lista`)
      }
    } catch (err) {
      reportWriteError(err)
    } finally {
      setBusy(null)
    }
  }

  async function reopen() {
    if (busyRef.current) return
    setBusy('reopen')
    try {
      const result = await reopenEntry(db, listId, entry, current)
      result.written.catch(reportWriteError)
      toast(isPurchase ? 'Compra reabierta' : 'Hechos reabiertos')
      for (const dup of result.duplicates) {
        toast(`${dup.name} ya estaba pendiente`, { action: { label: 'Ver', onClick: () => onShowInList(dup.existingId) } })
      }
    } catch (err) {
      reportWriteError(err)
    } finally {
      setBusy(null)
    }
  }

  return (
    <li className="rounded-lg border">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex min-h-14 w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="flex flex-col gap-0.5">
          <span className="font-medium">
            {isPurchase ? 'Compra' : 'Hechos archivados'} · {count} {count === 1 ? 'elemento' : 'elementos'}
          </span>
          <span className="text-sm text-muted-foreground">
            {dateFormat.format(entry.closedAt.toDate())} · {entry.closedByName}
          </span>
        </span>
        <ChevronDownIcon className={cn('size-4 shrink-0 transition-transform duration-150', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="flex flex-col gap-3 border-t px-4 py-3">
          <ul className="flex flex-col">
            {entry.items.map((item) => {
              const id = `h-${entry.id}-${item.itemId}`
              const detail = itemDetail(item)
              return (
                <li key={item.itemId} className="flex min-h-12 items-center gap-3">
                  <Checkbox
                    id={id}
                    aria-label={`Elegir ${item.name}`}
                    checked={selected.includes(item.itemId)}
                    onCheckedChange={(checked) =>
                      setSelected(checked ? [...selected, item.itemId] : selected.filter((s) => s !== item.itemId))
                    }
                  />
                  <label htmlFor={id} className="flex min-w-0 flex-1 flex-col py-1">
                    <span className="truncate">{item.name}</span>
                    {detail && <span className="truncate text-sm text-muted-foreground">{detail}</span>}
                    <span className="truncate text-xs text-muted-foreground">
                      Agregó {item.addedByName} · Completó {item.doneByName}
                    </span>
                  </label>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Regresar ${item.name}`}
                    title="Regresar a la lista"
                    disabled={busy !== null}
                    onClick={() => giveBack(item)}
                  >
                    <Undo2Icon />
                  </Button>
                </li>
              )
            })}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={selected.length === 0} onClick={readd}>
              Volver a agregar{selected.length ? ` (${selected.length})` : ''}
            </Button>
            <Button size="sm" variant="outline" disabled={busy !== null} onClick={reopen}>
              <RotateCcwIcon data-icon="inline-start" />
              Reabrir
            </Button>
          </div>
        </div>
      )}
    </li>
  )
}

export default function HistoryScreen() {
  const { listId = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const userDoc = useUserDoc()
  const list = useList(listId)
  const history = useHistory(listId)
  const current = useItems(listId)
  const [filter, setFilter] = useState<Filter>('all')

  const by: Actor = { uid: user!.uid, name: userDoc?.displayName ?? user?.displayName ?? 'Sin nombre' }
  const entries = (history ?? []).filter((e) => filter === 'all' || e.kind === filter)
  const showInList = (itemId: string) => navigate(`/l/${listId}`, { state: { highlight: itemId } })

  return (
    <main className="mx-auto flex max-w-[480px] flex-col gap-6 px-4 py-6">
      <ScreenHeader title="Historial" back={`/l/${listId}`} backLabel={list?.name ?? 'Lista'} />

      <div role="group" aria-label="Filtrar historial" className="flex gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            size="sm"
            variant={filter === f.value ? 'default' : 'outline'}
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {history !== null && entries.length === 0 && (
        <p className="py-8 text-center text-muted-foreground">Todavía no hay nada aquí.</p>
      )}
      <ul className="flex flex-col gap-3">
        {entries.map((entry) => (
          <Entry key={entry.id} entry={entry} current={current} by={by} onShowInList={showInList} />
        ))}
      </ul>
    </main>
  )
}
