import { useEffect, useRef, useState } from 'react'
import { Loader2Icon } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/ui/button'
import { getInviteStatus, joinList, type InviteStatus } from '@/data/sharing'
import type { InviteDoc } from '@/data/types'
import { db } from '@/firebase'
import { useAuth } from '@/hooks/useAuth'
import { useUserDoc } from '@/hooks/useUserDoc'
import { showSaveError } from '@/lib/saveError'

const MESSAGES: Record<Exclude<InviteStatus, 'ok' | 'already-member'>, string> = {
  used: 'Este link ya se usó',
  expired: 'Este link venció',
  revoked: 'Este link fue cancelado',
  'not-found': 'Link inválido',
}

export default function JoinScreen() {
  const { listId = '', token = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const userDoc = useUserDoc()
  const uid = user!.uid
  const [state, setState] = useState<{ status: InviteStatus; invite?: InviteDoc } | null>(null)
  const [joining, setJoining] = useState(false)
  const joiningRef = useRef(false)

  useEffect(() => {
    let active = true
    getInviteStatus(db, uid, listId, token)
      .then((result) => {
        if (!active) return
        if (result.status === 'already-member') navigate(`/l/${listId}`, { replace: true })
        else setState(result)
      })
      .catch(() => active && setState({ status: 'not-found' }))
    return () => {
      active = false
    }
  }, [uid, listId, token, navigate])

  async function join() {
    if (joiningRef.current) return
    joiningRef.current = true
    setJoining(true)
    try {
      await joinList(
        db,
        { uid, displayName: userDoc?.displayName ?? user?.displayName ?? 'Sin nombre', photoURL: user?.photoURL ?? null },
        listId,
        token,
      )
      navigate(`/l/${listId}`, { replace: true })
    } catch (err) {
      showSaveError(err)
      // Pudo vencer o usarse mientras tanto: se muestra el motivo.
      setState(await getInviteStatus(db, uid, listId, token).catch(() => ({ status: 'not-found' as const })))
    } finally {
      joiningRef.current = false
      setJoining(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center gap-8 px-4 py-6">
      <h1 className="text-2xl font-semibold">Unirse a una lista</h1>
      {state === null && <p className="text-muted-foreground">Revisando el link…</p>}

      {state?.status === 'ok' && state.invite && (
        <>
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <Avatar name={state.invite.ownerName} photoURL={state.invite.ownerPhotoURL} className="size-10 text-sm" />
            <p>
              <span className="font-medium">{state.invite.ownerName}</span> te invita a{' '}
              <span className="font-medium">“{state.invite.listName}”</span>.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">Al unirte, la lista aparece en tus listas. Nada de lo tuyo cambia.</p>
          <Button size="lg" onClick={join} disabled={joining}>
            {joining && <Loader2Icon className="animate-spin" data-icon="inline-start" />}
            Unirme
          </Button>
        </>
      )}

      {state && state.status !== 'ok' && state.status !== 'already-member' && (
        <>
          <p className="text-lg">{MESSAGES[state.status]}</p>
          <p className="text-muted-foreground">Pide a quien te lo mandó un link nuevo.</p>
          <Button variant="outline" className="self-start" asChild>
            <Link to="/">Ir a mis listas</Link>
          </Button>
        </>
      )}
    </main>
  )
}
