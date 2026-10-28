import { useEffect, useRef, useState } from 'react'
import { ChevronRightIcon, DownloadIcon, Loader2Icon, LogOutIcon } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { signOutUser } from '@/auth'
import { ScreenHeader } from '@/components/ScreenHeader'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ensureFolder, folderUrl, getDriveToken, listNames, loadGis, uniqueName, uploadFile } from '@/data/drive'
import { collectExport, historyCsv, itemsCsv } from '@/data/export'
import { setDriveFolderId } from '@/data/users'
import { auth, db } from '@/firebase'
import { useAuth } from '@/hooks/useAuth'
import { useUserDoc } from '@/hooks/useUserDoc'
import { downloadFiles, type TextFile } from '@/lib/download'

const rowClass =
  'flex min-h-14 items-center justify-between px-4 outline-none transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-ring/50 active:bg-muted [@media(hover:hover)]:hover:bg-muted'

// Sin client id (desarrollo) el respaldo se descarga directo al celular.
const CLIENT_ID: string | undefined = import.meta.env.VITE_GOOGLE_CLIENT_ID

type Format = 'json' | 'csv'
type Upload = Omit<TextFile, 'name'> & { base: string; ext: string }

function today(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

async function buildFiles(uid: string, format: Format): Promise<Upload[]> {
  const data = await collectExport(db, uid)
  const date = today()
  if (format === 'json') {
    return [{ base: `tickoff-${date}`, ext: 'json', mime: 'application/json', content: JSON.stringify(data, null, 2) }]
  }
  return [
    { base: `tickoff-elementos-${date}`, ext: 'csv', mime: 'text/csv', content: itemsCsv(data) },
    { base: `tickoff-historial-${date}`, ext: 'csv', mime: 'text/csv', content: historyCsv(data) },
  ]
}

/** Sube los archivos sin pisar uno del mismo día (agrega la hora al nombre). */
async function uploadAll(token: string, folderId: string, files: Upload[]): Promise<void> {
  const existing = await listNames(token, folderId)
  const now = new Date()
  for (const file of files) {
    await uploadFile(token, folderId, uniqueName(existing, file.base, file.ext, now), file.mime, file.content)
  }
}

const asLocal = (files: Upload[]): TextFile[] =>
  files.map(({ base, ext, mime, content }) => ({ name: `${base}.${ext}`, mime, content }))

export default function Settings() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const uid = user!.uid
  const userDoc = useUserDoc()
  const [busy, setBusy] = useState<Format | null>(null)
  const busyRef = useRef(false)
  // Respaldo que no se pudo subir: se ofrece descargarlo.
  const [failed, setFailed] = useState<TextFile[] | null>(null)

  // Cargar Google Identity antes del toque: si se carga al tocar, el navegador
  // puede bloquear la ventana de permiso.
  useEffect(() => {
    if (CLIENT_ID) loadGis().catch(() => {})
  }, [])

  async function exportAs(format: Format) {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(format)
    let files: Upload[] | null = null
    try {
      if (!CLIENT_ID) {
        files = await buildFiles(uid, format)
        await downloadFiles(asLocal(files))
        return
      }
      // El permiso primero, todavía dentro del toque.
      const token = await getDriveToken(CLIENT_ID)
      files = await buildFiles(uid, format)
      const folderId = await ensureFolder(token, userDoc?.driveFolderId ?? null)
      if (folderId !== userDoc?.driveFolderId) setDriveFolderId(db, uid, folderId).catch(console.error)
      await uploadAll(token, folderId, files)
      toast('Guardado en Drive › tickoff', {
        action: { label: 'Abrir', onClick: () => window.open(folderUrl(folderId), '_blank', 'noopener') },
      })
    } catch (err) {
      console.error(err)
      // AbortError: se cerró el menú de compartir; no es un error.
      if ((err as Error).name === 'AbortError') return
      if (files) setFailed(asLocal(files))
      else toast.error('No se pudo preparar el respaldo. Inténtalo otra vez.')
    } finally {
      busyRef.current = false
      setBusy(null)
    }
  }

  async function downloadFailed() {
    if (!failed) return
    try {
      await downloadFiles(failed)
      setFailed(null)
    } catch (err) {
      if ((err as Error).name !== 'AbortError') toast.error('No se pudo descargar el respaldo')
    }
  }

  return (
    <main className="mx-auto flex max-w-[480px] flex-col gap-6 px-4 py-6">
      <ScreenHeader title="Ajustes" back="/" backLabel="Inicio" />

      <nav className="flex flex-col divide-y overflow-hidden rounded-lg border">
        <Link to="/settings/categories" className={rowClass}>
          Categorías
          <ChevronRightIcon className="size-4 text-muted-foreground" />
        </Link>
        <Link to="/settings/stores" className={rowClass}>
          Tiendas
          <ChevronRightIcon className="size-4 text-muted-foreground" />
        </Link>
      </nav>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Respaldo</h2>
        <p className="text-sm text-muted-foreground">
          {CLIENT_ID
            ? 'Se guarda en tu Google Drive, en la carpeta “tickoff”.'
            : 'Se descarga a este dispositivo.'}{' '}
          Incluye todas tus listas, con su historial.
        </p>
        <div className="flex flex-wrap gap-2">
          {(['json', 'csv'] as const).map((format) => (
            <Button key={format} variant="outline" disabled={busy !== null} onClick={() => exportAs(format)}>
              {busy === format && <Loader2Icon className="animate-spin" data-icon="inline-start" />}
              {format === 'json' ? 'Exportar JSON' : 'Exportar CSV'}
            </Button>
          ))}
        </div>
      </section>

      <Button
        variant="outline"
        className="self-start"
        onClick={async () => {
          await signOutUser(auth)
          navigate('/')
        }}
      >
        <LogOutIcon data-icon="inline-start" />
        Cerrar sesión
      </Button>

      <p className="text-sm text-muted-foreground">Versión {__APP_VERSION__}</p>

      <Dialog open={failed !== null} onOpenChange={(open) => !open && setFailed(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No se pudo guardar en Drive</DialogTitle>
            <DialogDescription>Revisa tu conexión o descarga el respaldo a tu celular.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFailed(null)}>
              Cancelar
            </Button>
            <Button onClick={downloadFailed}>
              <DownloadIcon data-icon="inline-start" />
              Descargar al celular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
