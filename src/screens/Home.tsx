import { useEffect } from 'react'
import { SettingsIcon, UsersIcon } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { CategoryChip } from '@/components/CategoryChip'
import { NewListDialog } from '@/components/NewListDialog'
import { Button } from '@/components/ui/button'
import type { ListDoc } from '@/data/types'
import { groupListsByCategory } from '@/domain/home'
import { useAuth } from '@/hooks/useAuth'
import { useCategories } from '@/hooks/useCategories'
import { useListPrefs } from '@/hooks/useListPrefs'
import { useLists } from '@/hooks/useLists'
import { usePendingCounts } from '@/hooks/usePendingCounts'
import { useUserDoc } from '@/hooks/useUserDoc'
import { markStarted, STARTED_KEY } from '@/lib/session'

function ListCard({ list }: { list: ListDoc }) {
  const counts = usePendingCounts(list.id)
  const shared = list.memberIds.length > 1

  return (
    <Link
      to={`/l/${list.id}`}
      className="flex min-h-14 items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:bg-muted [@media(hover:hover)]:hover:bg-muted"
    >
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate font-medium">{list.name}</span>
        <span className="flex gap-2 text-sm text-muted-foreground">
          {counts.buy === 0 && counts.do === 0 ? (
            <span>Sin pendientes</span>
          ) : (
            <>
              {counts.buy > 0 && <span>{counts.buy} por comprar</span>}
              {counts.do > 0 && <span>{counts.do} por hacer</span>}
            </>
          )}
        </span>
      </span>
      {shared && <UsersIcon role="img" aria-label="Compartida" className="size-4 shrink-0 text-muted-foreground" />}
    </Link>
  )
}

export default function Home() {
  const { user } = useAuth()
  const uid = user?.uid ?? null
  const userDoc = useUserDoc()
  const lists = useLists(uid)
  const prefs = useListPrefs(uid)
  const categories = useCategories(uid)
  const navigate = useNavigate()

  useEffect(() => {
    if (!userDoc || lists === null || sessionStorage.getItem(STARTED_KEY)) return
    markStarted()
    const last = userDoc.lastListId
    if (last && lists.some((l) => l.id === last)) navigate(`/l/${last}`)
  }, [userDoc, lists, navigate])

  const groups = groupListsByCategory(lists ?? [], prefs, categories)

  return (
    <main className="mx-auto flex max-w-[480px] flex-col gap-8 px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">tickoff</h1>
        <Button variant="ghost" size="icon" asChild>
          <Link to="/settings" aria-label="Ajustes">
            <SettingsIcon />
          </Link>
        </Button>
      </header>

      {lists !== null && groups.length === 0 && (
        <p className="text-muted-foreground">Todavía no tienes listas.</p>
      )}

      {groups.map((group) => (
        <section key={group.category?.id ?? 'none'} className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            {group.category && <CategoryChip category={group.category} className="size-6" />}
            {group.category?.name ?? 'Sin categoría'}
          </h2>
          <div className="flex flex-col gap-2">
            {group.lists.map((list) => (
              <ListCard key={list.id} list={list} />
            ))}
          </div>
        </section>
      ))}

      {uid && (
        <div className="sticky bottom-4 flex justify-end pb-[env(safe-area-inset-bottom)]">
          <NewListDialog
            uid={uid}
            member={{ displayName: userDoc?.displayName ?? user?.displayName ?? 'Sin nombre', photoURL: user?.photoURL ?? null }}
            categories={categories}
          />
        </div>
      )}
    </main>
  )
}
