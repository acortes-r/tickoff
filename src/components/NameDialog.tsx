import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { cleanName } from '@/domain/text'

const NAME_ERROR = 'Escribe un nombre de hasta 200 caracteres'

/**
 * Diálogo con un campo "Nombre" ya validado. `children` agrega campos extra
 * (íconos, tonos). `onSave` recibe el nombre limpio; el diálogo se cierra solo.
 */
export function NameDialog({
  open,
  onOpenChange,
  title,
  description,
  initialName = '',
  onSave,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  initialName?: string
  onSave: (name: string) => void
  children?: ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* key reinicia el formulario cada vez que se abre */}
        {open && (
          <NameForm
            key={initialName}
            title={title}
            description={description}
            initialName={initialName}
            onSave={(name) => {
              onSave(name)
              onOpenChange(false)
            }}
          >
            {children}
          </NameForm>
        )}
      </DialogContent>
    </Dialog>
  )
}

function NameForm({
  title,
  description,
  initialName,
  onSave,
  children,
}: {
  title: string
  description?: string
  initialName: string
  onSave: (name: string) => void
  children?: ReactNode
}) {
  const [name, setName] = useState(initialName)
  const [error, setError] = useState<string | null>(null)

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        const clean = cleanName(name)
        if (!clean) return setError(NAME_ERROR)
        onSave(clean)
      }}
    >
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription className={description ? undefined : 'sr-only'}>{description ?? title}</DialogDescription>
      </DialogHeader>
      <FieldGroup className="py-4">
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="name-dialog-input">Nombre</FieldLabel>
          <Input
            id="name-dialog-input"
            value={name}
            autoComplete="off"
            aria-invalid={error ? true : undefined}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setError(name && !cleanName(name) ? NAME_ERROR : null)}
          />
          {error && <FieldError>{error}</FieldError>}
        </Field>
        {children}
      </FieldGroup>
      <DialogFooter>
        <Button type="submit">Guardar</Button>
      </DialogFooter>
    </form>
  )
}
