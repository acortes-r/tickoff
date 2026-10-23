import { useState } from 'react'
import { ArrowRightLeftIcon, Trash2Icon } from 'lucide-react'
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
} from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { ItemDoc, ItemKind } from '@/data/types'
import { cleanName } from '@/domain/text'

const NO_STORE = '__none__'
const NAME_ERROR = 'Escribe un nombre de hasta 200 caracteres'
const TAB_NAME: Record<ItemKind, string> = { buy: 'Comprar', do: 'Hacer' }

export type ItemChanges = Partial<Pick<ItemDoc, 'name' | 'quantity' | 'storeName' | 'note' | 'kind'>>

/** Editar un elemento: campos de su pestaña, moverlo a la otra pestaña o borrarlo. */
export function ItemEditor({
  item,
  storeOptions,
  onClose,
  onSave,
  onDelete,
}: {
  item: ItemDoc | null
  storeOptions: string[]
  onClose: () => void
  onSave: (changes: ItemChanges) => void
  onDelete: () => void
}) {
  return (
    <Dialog open={item !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {item && (
          <EditorForm
            key={item.id}
            item={item}
            storeOptions={storeOptions}
            onSave={(changes) => {
              if (Object.keys(changes).length > 0) onSave(changes)
              onClose()
            }}
            onDelete={() => {
              onDelete()
              onClose()
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function EditorForm({
  item,
  storeOptions,
  onSave,
  onDelete,
}: {
  item: ItemDoc
  storeOptions: string[]
  onSave: (changes: ItemChanges) => void
  onDelete: () => void
}) {
  const [kind, setKind] = useState<ItemKind>(item.kind)
  const [name, setName] = useState(item.name)
  const [quantity, setQuantity] = useState(item.quantity ?? '')
  const [store, setStore] = useState<string | null>(item.storeName ?? null)
  const [note, setNote] = useState(item.note ?? '')
  const [error, setError] = useState<string | null>(null)
  const options = store && !storeOptions.includes(store) ? [...storeOptions, store] : storeOptions
  const other: ItemKind = kind === 'buy' ? 'do' : 'buy'

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const clean = cleanName(name)
    if (!clean) return setError(NAME_ERROR)
    // Solo lo que cambió: otro miembro puede estar editando otro campo.
    const changes: ItemChanges = {}
    if (clean !== item.name) changes.name = clean
    if (kind !== item.kind) changes.kind = kind
    if (kind === 'buy') {
      if (quantity.trim() !== (item.quantity ?? '')) changes.quantity = quantity.trim()
      if (store !== (item.storeName ?? null)) changes.storeName = store
    } else if (note.trim() !== (item.note ?? '')) {
      changes.note = note.trim()
    }
    onSave(changes)
  }

  return (
    <form onSubmit={submit} noValidate>
      <DialogHeader>
        <DialogTitle>Editar</DialogTitle>
        <DialogDescription>En la pestaña {TAB_NAME[kind]}.</DialogDescription>
      </DialogHeader>
      <FieldGroup className="py-4">
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="item-name">Nombre</FieldLabel>
          <Input
            id="item-name"
            value={name}
            autoComplete="off"
            aria-invalid={error ? true : undefined}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setError(cleanName(name) ? null : NAME_ERROR)}
          />
          {error && <FieldError>{error}</FieldError>}
        </Field>
        {kind === 'buy' ? (
          <>
            <Field>
              <FieldLabel htmlFor="item-quantity">
                Cantidad <span className="font-normal text-muted-foreground">(opcional)</span>
              </FieldLabel>
              <Input id="item-quantity" value={quantity} maxLength={200} onChange={(e) => setQuantity(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="item-store">Tienda</FieldLabel>
              <Select value={store ?? NO_STORE} onValueChange={(v) => setStore(v === NO_STORE ? null : v)}>
                <SelectTrigger id="item-store" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                  <SelectItem value={NO_STORE}>Sin tienda</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </>
        ) : (
          <Field>
            <FieldLabel htmlFor="item-note">
              Nota <span className="font-normal text-muted-foreground">(opcional)</span>
            </FieldLabel>
            <Input id="item-note" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />
          </Field>
        )}
        <Button type="button" variant="outline" className="self-start" onClick={() => setKind(other)}>
          <ArrowRightLeftIcon data-icon="inline-start" />
          Mover a {TAB_NAME[other]}
        </Button>
      </FieldGroup>
      <DialogFooter className="sm:justify-between">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="destructive">
              <Trash2Icon data-icon="inline-start" />
              Borrar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Borrar “{item.name}”?</AlertDialogTitle>
              <AlertDialogDescription>Se quita de la lista para todos los miembros.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={onDelete}>
                Borrar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button type="submit">Guardar</Button>
      </DialogFooter>
    </form>
  )
}
