import { collection } from 'firebase/firestore'
import { useMemo } from 'react'
import { withId, type ListPrefsDoc } from '@/data/types'
import { db } from '@/firebase'
import { useQueryData } from './useQueryData'

/** Preferencias personales por lista (categoría, última pestaña), por id de lista. */
export function useListPrefs(uid: string | null): Record<string, ListPrefsDoc> {
  const prefs = useQueryData(uid && `listPrefs:${uid}`, () =>
    collection(db, 'users', uid!, 'listPrefs').withConverter(withId<ListPrefsDoc>()),
  )
  return useMemo(() => Object.fromEntries((prefs ?? []).map((p) => [p.id, p])), [prefs])
}
