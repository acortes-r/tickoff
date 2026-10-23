import type { ReactNode } from 'react'
import { ChevronLeftIcon } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

/** Encabezado de pantalla secundaria: regresar, título y acción opcional. */
export function ScreenHeader({
  title,
  back,
  backLabel,
  action,
}: {
  title: string
  back: string
  backLabel: string
  action?: ReactNode
}) {
  return (
    <header className="flex flex-col gap-2">
      <Button variant="ghost" size="sm" className="-ml-2 self-start" asChild>
        <Link to={back}>
          <ChevronLeftIcon data-icon="inline-start" />
          {backLabel}
        </Link>
      </Button>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {action}
      </div>
    </header>
  )
}
