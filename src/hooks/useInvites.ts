import { collection } from 'firebase/firestore'
import { useMemo, useState } from 'react'
import { withId, type InviteDoc } from '@/data/types'
import { db } from '@/firebase'
import { useQueryData } from './useQueryData'

/** Invitaciones vigentes de la lista. Solo el dueño puede leerlas: `enabled` = es dueño. */
export function useInvites(listId: string, enabled: boolean): InviteDoc[] {
  // Hora de referencia para descartar vencidas; basta la de cuando se abrió la pantalla.
  const [now] = useState(() => Date.now())
  const invites = useQueryData(enabled ? `invites:${listId}` : null, () =>
    collection(db, 'lists', listId, 'invites').withConverter(withId<InviteDoc>()),
  )
  return useMemo(() => {
    return (invites ?? [])
      .filter((i) => !i.usedBy && !i.revoked && i.expiresAt.toMillis() > now)
      .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
  }, [invites, now])
}
