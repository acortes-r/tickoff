import { collection } from 'firebase/firestore'
import { useMemo } from 'react'
import { withId, type ListPrefsDoc } from '@/data/types'
import { db } from '@/firebase'
import { useQueryData } from './useQueryData'

/** Preferencias por lista y si ya cargaron (el aviso al abrir necesita saberlo). */
export function useListPrefsState(uid: string | null): { prefs: Record<string, ListPrefsDoc>; loaded: boolean } {
  const docs = useQueryData(uid && `listPrefs:${uid}`, () =>
    collection(db, 'users', uid!, 'listPrefs').withConverter(withId<ListPrefsDoc>()),
  )
  const prefs = useMemo(() => Object.fromEntries((docs ?? []).map((p) => [p.id, p])), [docs])
  return { prefs, loaded: docs !== null }
}

/** Preferencias personales por lista (categoría, última pestaña), por id de lista. */
export function useListPrefs(uid: string | null): Record<string, ListPrefsDoc> {
  return useListPrefsState(uid).prefs
}
