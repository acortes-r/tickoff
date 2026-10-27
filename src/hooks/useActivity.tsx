import { collection, limit, onSnapshot, orderBy, query, Timestamp, where } from 'firebase/firestore'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { withId, type ActivityDoc, type ListDoc } from '@/data/types'
import type { ListActivity } from '@/domain/activity'
import { db } from '@/firebase'

const KEEP_MS = 30 * 24 * 60 * 60 * 1000
const PER_LIST = 100

interface ActivityState {
  /** Actividad de los últimos 30 días de todas mis listas. */
  entries: ListActivity[]
  /** Ya llegó la primera respuesta de cada lista. */
  ready: boolean
}

const ActivityContext = createContext<ActivityState>({ entries: [], ready: false })

/** Escucha una vez la bitácora de cada lista; la comparten campana, Inicio y aviso al abrir. */
export function ActivityProvider({ lists, children }: { lists: ListDoc[] | null; children: ReactNode }) {
  const [byList, setByList] = useState<Record<string, ListActivity[]>>({})
  const listKey = lists?.map((l) => `${l.id}:${l.name}`).join('|') ?? ''

  useEffect(() => {
    if (!lists) return
    const since = Timestamp.fromMillis(Date.now() - KEEP_MS)
    const unsubscribes = lists.map((list) =>
      onSnapshot(
        query(
          collection(db, 'lists', list.id, 'activity'),
          where('at', '>', since),
          orderBy('at', 'desc'),
          limit(PER_LIST),
        ).withConverter(withId<ActivityDoc>()),
        (snap) =>
          setByList((prev) => ({
            ...prev,
            [list.id]: snap.docs.map((d) => ({ ...d.data(), listId: list.id, listName: list.name })),
          })),
        () => setByList((prev) => ({ ...prev, [list.id]: [] })),
      ),
    )
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe())
    // listKey resume las listas (id y nombre).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listKey])

  const value = useMemo<ActivityState>(() => {
    const ids = lists?.map((l) => l.id) ?? []
    return {
      entries: ids.flatMap((id) => byList[id] ?? []),
      ready: lists !== null && ids.every((id) => byList[id] !== undefined),
    }
  }, [byList, lists])

  return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>
}

// eslint-disable-next-line react/only-export-components
export function useActivity(): ActivityState {
  return useContext(ActivityContext)
}
