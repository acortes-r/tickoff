import { useState } from 'react'
import { Loader2Icon, OctagonXIcon } from 'lucide-react'
import { signIn } from '@/auth'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { auth } from '@/firebase'

// Cerrar el popup no es un error que haya que mostrar.
const SILENT_CODES = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request']

export default function Login() {
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  async function handleSignIn() {
    setPending(true)
    setFailed(false)
    try {
      await signIn(auth)
    } catch (err) {
      if (!SILENT_CODES.includes((err as { code?: string }).code ?? '')) setFailed(true)
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center gap-8 px-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">tickoff</h1>
        <p className="text-muted-foreground">Tus listas de compras y pendientes, solas o compartidas.</p>
      </div>
      {failed && (
        <Alert variant="destructive">
          <OctagonXIcon />
          <AlertTitle>No se pudo entrar</AlertTitle>
          <AlertDescription>Revisa tu conexión e inténtalo otra vez.</AlertDescription>
        </Alert>
      )}
      <Button size="lg" onClick={handleSignIn} disabled={pending}>
        {pending && <Loader2Icon className="animate-spin" data-icon="inline-start" />}
        Entrar con Google
      </Button>
    </main>
  )
}
