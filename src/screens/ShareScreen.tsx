import { useRef, useState, type ReactNode } from 'react'
import { CopyIcon, Loader2Icon, LogOutIcon, ShareIcon, Trash2Icon, UserMinusIcon, XIcon } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { Avatar } from '@/components/Avatar'
import { ScreenHeader } from '@/components/ScreenHeader'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { deleteListCascade } from '@/data/lists'
import { createInvite, leaveList, removeMember, revokeInvite } from '@/data/sharing'
import { db } from '@/firebase'
import { useAuth } from '@/hooks/useAuth'
import { useInvites } from '@/hooks/useInvites'
import { useList } from '@/hooks/useList'
import { useUserDoc } from '@/hooks/useUserDoc'
import { showSaveError } from '@/lib/saveError'

const expiresFormat = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })

function inviteUrl(listId: string, token: string): string {
  return `${location.origin}/join/${listId}/${token}`
}

async function copyLink(url: string) {
  try {
    await navigator.clipboard.writeText(url)
    toast('Link copiado')
  } catch {
    toast.error('No se pudo copiar el link')
  }
}

/** Confirmación para acciones destructivas (DESIGN.md: AlertDialog). */
function Confirm({
  trigger,
  title,
  description,
  action,
  onConfirm,
}: {
  trigger: ReactNode
  title: string
  description: string
  action: string
  onConfirm: () => void
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            {action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default function ShareScreen() {
  const { listId = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const uid = user!.uid
  const userDoc = useUserDoc()
  const list = useList(listId)
  const isOwner = list?.ownerId === uid
  const invites = useInvites(listId, isOwner)
  const [sharing, setSharing] = useState(false)
  const sharingRef = useRef(false)

  if (list === undefined) return null
  if (list === null) {
    return (
      <main className="mx-auto flex max-w-[480px] flex-col gap-6 px-4 py-6">
        <ScreenHeader title="Lista no disponible" back="/" backLabel="Inicio" />
        <p className="text-muted-foreground">Esta lista ya no existe o ya no tienes acceso.</p>
      </main>
    )
  }

  const members = Object.entries(list.members).sort(([a], [b]) =>
    a === list.ownerId ? -1 : b === list.ownerId ? 1 : 0,
  )

  async function share() {
    if (sharingRef.current) return
    sharingRef.current = true
    setSharing(true)
    try {
      const owner = {
        uid,
        displayName: userDoc?.displayName ?? user?.displayName ?? 'Sin nombre',
        photoURL: user?.photoURL ?? null,
      }
      const { url } = await createInvite(db, list!, owner)
      const text = `${owner.displayName} te invita a la lista “${list!.name}” en tickoff`
      if (navigator.share) {
        await navigator.share({ title: list!.name, text, url }).catch((err: Error) => {
          // Cerrar el menú de compartir no es un error; si falla de otra forma, se copia.
          if (err.name !== 'AbortError') return copyLink(url)
        })
      } else {
        await copyLink(url)
      }
    } catch (err) {
      showSaveError(err)
    } finally {
      sharingRef.current = false
      setSharing(false)
    }
  }

  return (
    <main className="mx-auto flex max-w-[480px] flex-col gap-8 px-4 py-6">
      <ScreenHeader title="Compartir" back={`/l/${listId}`} backLabel={list.name} />

      {isOwner && (
        <section className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Manda un link para que alguien se una a “{list.name}”. Sirve una sola vez y vence en 7 días.
          </p>
          <Button size="lg" className="self-start" onClick={share} disabled={sharing}>
            {sharing ? <Loader2Icon className="animate-spin" data-icon="inline-start" /> : <ShareIcon data-icon="inline-start" />}
            Compartir
          </Button>
        </section>
      )}

      {isOwner && invites.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">Invitaciones pendientes</h2>
          <ul className="flex flex-col divide-y rounded-lg border">
            {invites.map((invite) => (
              <li key={invite.id} className="flex min-h-14 items-center justify-between gap-2 py-2 pr-2 pl-4">
                <span className="text-sm">Vence el {expiresFormat.format(invite.expiresAt.toDate())}</span>
                <span className="flex shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Copiar link"
                    onClick={() => copyLink(inviteUrl(listId, invite.id))}
                  >
                    <CopyIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Cancelar invitación"
                    onClick={() => revokeInvite(db, listId, invite.id).catch(showSaveError)}
                  >
                    <XIcon />
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Miembros</h2>
        <ul className="flex flex-col divide-y rounded-lg border">
          {members.map(([memberId, member]) => (
            <li key={memberId} className="flex min-h-14 items-center justify-between gap-2 py-2 pr-2 pl-4">
              <span className="flex min-w-0 items-center gap-3">
                <Avatar name={member.displayName} photoURL={member.photoURL} className="size-8 text-xs" />
                <span className="truncate">
                  {member.displayName}
                  {memberId === list.ownerId && <span className="text-muted-foreground"> · dueño</span>}
                  {memberId === uid && memberId !== list.ownerId && <span className="text-muted-foreground"> · tú</span>}
                </span>
              </span>
              {isOwner && memberId !== uid && (
                <Confirm
                  trigger={
                    <Button variant="ghost" size="icon" aria-label={`Sacar a ${member.displayName}`}>
                      <UserMinusIcon />
                    </Button>
                  }
                  title={`¿Sacar a ${member.displayName}?`}
                  description="Deja de ver esta lista. Para volver necesita otra invitación."
                  action="Sacar"
                  onConfirm={() => removeMember(db, listId, memberId).catch(showSaveError)}
                />
              )}
            </li>
          ))}
        </ul>
      </section>

      {isOwner ? (
        <Confirm
          trigger={
            <Button variant="destructive" className="self-start">
              <Trash2Icon data-icon="inline-start" />
              Borrar lista
            </Button>
          }
          title={`¿Borrar “${list.name}”?`}
          description="Se borra para todos los miembros, con su historial. No se puede deshacer."
          action="Borrar"
          onConfirm={() => {
            navigate('/', { replace: true })
            deleteListCascade(db, listId).catch(showSaveError)
          }}
        />
      ) : (
        <Confirm
          trigger={
            <Button variant="destructive" className="self-start">
              <LogOutIcon data-icon="inline-start" />
              Salir de la lista
            </Button>
          }
          title={`¿Salir de “${list.name}”?`}
          description="Dejas de verla. Para volver necesitas otra invitación."
          action="Salir"
          onConfirm={() => {
            navigate('/', { replace: true })
            leaveList(db, uid, listId).catch(showSaveError)
          }}
        />
      )}
    </main>
  )
}
