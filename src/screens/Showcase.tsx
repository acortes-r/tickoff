import { useState } from 'react'
import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, PlusIcon, TriangleAlertIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { CATEGORY_TONES } from '@/lib/tones'
import { setThemeOverride } from '@/lib/theme'

const variants = ['default', 'secondary', 'outline', 'ghost', 'destructive'] as const
const sizes = ['sm', 'default', 'lg'] as const

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function DemoForm() {
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)

  const validate = (value: string) => (value.trim() ? null : 'Escribe un nombre para la lista')

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        const error = validate(name)
        setNameError(error)
        if (!error) toast.success('Lista creada')
      }}
    >
      <FieldGroup>
        <Field data-invalid={nameError ? true : undefined}>
          <FieldLabel htmlFor="demo-name">Nombre de la lista</FieldLabel>
          <Input
            id="demo-name"
            value={name}
            aria-invalid={nameError ? true : undefined}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setNameError(validate(name))}
          />
          {nameError && <FieldError>{nameError}</FieldError>}
        </Field>
        <Field>
          <FieldLabel htmlFor="demo-category">Categoría</FieldLabel>
          <Select defaultValue="despensa">
            <SelectTrigger id="demo-category" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="despensa">Despensa</SelectItem>
              <SelectItem value="trabajo">Trabajo</SelectItem>
              <SelectItem value="sin">Sin categoría</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="demo-note">
            Nota <span className="font-normal text-muted-foreground">(opcional)</span>
          </FieldLabel>
          <Textarea id="demo-note" />
          <FieldDescription>Solo la ven los miembros de la lista.</FieldDescription>
        </Field>
        <Button type="submit" className="self-start">
          Crear lista
        </Button>
      </FieldGroup>
    </form>
  )
}

export default function Showcase() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  return (
    <main className="mx-auto flex max-w-[480px] flex-col gap-10 px-4 py-8">
      <Section title="Botones">
        {variants.map((variant) => (
          <div key={variant} className="flex flex-wrap items-center gap-2">
            {sizes.map((size) => (
              <Button key={size} variant={variant} size={size}>
                {variant}
              </Button>
            ))}
            <Button variant={variant} disabled>
              Deshabilitado
            </Button>
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-2">
          <Button disabled>
            <Loader2Icon className="animate-spin" data-icon="inline-start" />
            Guardando…
          </Button>
          <Button variant="outline" size="icon" aria-label="Agregar">
            <PlusIcon />
          </Button>
        </div>
      </Section>

      <Section title="Formulario">
        <DemoForm />
      </Section>

      <Section title="Alertas">
        <Alert>
          <InfoIcon />
          <AlertTitle>Sin conexión</AlertTitle>
          <AlertDescription>Tus cambios se guardan al volver la señal.</AlertDescription>
        </Alert>
        <Alert variant="success">
          <CircleCheckIcon />
          <AlertTitle>Guardado en Drive</AlertTitle>
          <AlertDescription>El respaldo quedó en la carpeta tickoff.</AlertDescription>
        </Alert>
        <Alert variant="warning">
          <TriangleAlertIcon />
          <AlertTitle>Link por vencer</AlertTitle>
          <AlertDescription>La invitación vence mañana.</AlertDescription>
        </Alert>
        <Alert variant="destructive">
          <OctagonXIcon />
          <AlertTitle>No se pudo exportar</AlertTitle>
          <AlertDescription>Descarga el archivo al celular e inténtalo después.</AlertDescription>
        </Alert>
      </Section>

      <Section title="Modales">
        <div className="flex flex-wrap gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Renombrar lista</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Renombrar lista</DialogTitle>
                <DialogDescription>Los miembros verán el nombre nuevo.</DialogDescription>
              </DialogHeader>
              <Input aria-label="Nombre" defaultValue="Despensa" />
              <DialogFooter>
                <Button>Guardar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Borrar lista</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Borrar “Despensa”?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se borra para todos los miembros, con su historial. No se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction variant="destructive">Borrar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Section>

      <Section title="Avisos">
        <Button
          variant="secondary"
          className="self-start"
          onClick={() =>
            toast('Compra cerrada', {
              duration: 10_000,
              action: { label: 'Deshacer', onClick: () => toast('Compra reabierta') },
            })
          }
        >
          Terminar compra
        </Button>
      </Section>

      <Section title="Tonos de categoría">
        <div className="grid grid-cols-4 gap-2">
          {CATEGORY_TONES.map((tone) => (
            <div
              key={tone.id}
              className="flex h-11 items-center justify-center rounded-md text-sm font-medium"
              style={{ background: tone.bg, color: tone.fg }}
            >
              {tone.id}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Tema">
        <label className="flex items-center gap-3 text-sm">
          <Switch
            checked={dark}
            onCheckedChange={(checked) => {
              setDark(checked)
              setThemeOverride(checked ? 'dark' : 'light')
            }}
          />
          Modo oscuro
        </label>
      </Section>
    </main>
  )
}
