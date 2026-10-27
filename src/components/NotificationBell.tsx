import { useState } from 'react'
import { BellIcon } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { markNotificationsRead } from '@/data/activity'
import { describeGroup, groupActivity, unreadCount } from '@/domain/activity'
import { db } from '@/firebase'
import { useActivity } from '@/hooks/useActivity'
import { useAuth } from '@/hooks/useAuth'
import { useUserDoc } from '@/hooks/useUserDoc'
import { showSaveError } from '@/lib/saveError'

const relative = new Intl.RelativeTimeFormat('es-MX', { numeric: 'auto' })

function ago(date: Date): string {
  const minutes = Math.round((date.getTime() - Date.now()) / 60000)
  if (Math.abs(minutes) < 60) return relative.format(minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return relative.format(hours, 'hour')
  return relative.format(Math.round(hours / 24), 'day')
}

/** Campana: avisos de lo que hicieron otros en mis listas. Abrirla los marca como leídos. */
export function NotificationBell() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const uid = user!.uid
  const userDoc = useUserDoc()
  const { entries } = useActivity()
  const [open, setOpen] = useState(false)

  const groups = groupActivity(entries, uid)
  const unread = unreadCount(entries, uid, userDoc?.notificationsReadAt?.toDate() ?? null)
  const badge = unread > 9 ? '9+' : String(unread)

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next && unread > 0) markNotificationsRead(db, uid).catch(showSaveError)
      }}
    >
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={unread ? `Avisos, ${unread} sin leer` : 'Avisos'}>
          <BellIcon />
          {unread > 0 && (
            <span
              aria-hidden
              className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground tabular-nums"
            >
              {badge}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[80dvh] pb-[env(safe-area-inset-bottom)]">
        <SheetHeader>
          <SheetTitle>Avisos</SheetTitle>
          <SheetDescription>Lo que hicieron los demás en tus listas, últimos 30 días.</SheetDescription>
        </SheetHeader>
        {groups.length === 0 ? (
          <p className="px-4 pb-6 text-muted-foreground">Sin avisos por ahora.</p>
        ) : (
          <ul className="flex flex-col overflow-y-auto px-2 pb-4">
            {groups.map((g) => (
              <li key={`${g.listId}-${g.actorName}-${g.type}-${g.latestAt.getTime()}`}>
                <button
                  type="button"
                  className="flex min-h-14 w-full flex-col items-start justify-center gap-0.5 rounded-lg px-2 py-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:bg-muted"
                  onClick={() => {
                    setOpen(false)
                    navigate(`/l/${g.listId}`)
                  }}
                >
                  <span>{describeGroup(g)}</span>
                  <span className="text-sm text-muted-foreground">{ago(g.latestAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  )
}
