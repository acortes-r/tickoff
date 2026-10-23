import { ChevronRightIcon, LogOutIcon } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { signOutUser } from '@/auth'
import { ScreenHeader } from '@/components/ScreenHeader'
import { Button } from '@/components/ui/button'
import { auth } from '@/firebase'

const rowClass =
  'flex min-h-14 items-center justify-between px-4 outline-none transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-ring/50 active:bg-muted [@media(hover:hover)]:hover:bg-muted'

export default function Settings() {
  const navigate = useNavigate()

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
        <span className={`${rowClass} text-muted-foreground`} aria-disabled>
          Exportar respaldo
          <span className="text-sm">Próximamente</span>
        </span>
      </nav>

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
    </main>
  )
}
