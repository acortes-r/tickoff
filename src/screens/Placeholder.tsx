import { ChevronLeftIcon } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

/** Pantalla provisional para rutas cuya tarea todavía no se implementa. */
export default function Placeholder({ title }: { title: string }) {
  return (
    <main className="mx-auto flex max-w-[480px] flex-col gap-6 px-4 py-6">
      <Button variant="ghost" size="sm" className="self-start" asChild>
        <Link to="/">
          <ChevronLeftIcon data-icon="inline-start" />
          Inicio
        </Link>
      </Button>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-muted-foreground">Próximamente.</p>
    </main>
  )
}
