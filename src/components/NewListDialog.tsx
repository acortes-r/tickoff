import { useState } from 'react'
import { PlusIcon } from 'lucide-react'
import { useNavigate } from 'react-router'
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
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createList } from '@/data/lists'
import type { CategoryDoc, Member } from '@/data/types'
import { cleanName } from '@/domain/text'
import { db } from '@/firebase'
import { showSaveError } from '@/lib/saveError'

const NONE = 'none'
const NAME_ERROR = 'Escribe un nombre de hasta 200 caracteres'

export function NewListDialog({
  uid,
  member,
  categories,
}: {
  uid: string
  member: Member
  categories: CategoryDoc[]
}) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [categoryId, setCategoryId] = useState<string | null>(null)

  const selected = categoryId ?? categories[0]?.id ?? NONE

  function reset(next: boolean) {
    setOpen(next)
    if (!next) {
      setName('')
      setNameError(null)
      setCategoryId(null)
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const clean = cleanName(name)
    if (!clean) {
      setNameError(NAME_ERROR)
      return
    }
    const { id, written } = createList(db, uid, member, clean, selected === NONE ? null : selected)
    written.catch(showSaveError)
    reset(false)
    navigate(`/l/${id}`)
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger asChild>
        <Button size="lg">
          <PlusIcon data-icon="inline-start" />
          Nueva lista
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>Nueva lista</DialogTitle>
            <DialogDescription>Solo tú la ves hasta que la compartas.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="py-4">
            <Field data-invalid={nameError ? true : undefined}>
              <FieldLabel htmlFor="new-list-name">Nombre</FieldLabel>
              <Input
                id="new-list-name"
                value={name}
                autoComplete="off"
                aria-invalid={nameError ? true : undefined}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setNameError(name && !cleanName(name) ? NAME_ERROR : null)}
              />
              {nameError && <FieldError>{nameError}</FieldError>}
            </Field>
            <Field>
              <FieldLabel htmlFor="new-list-category">Categoría</FieldLabel>
              <Select value={selected} onValueChange={setCategoryId}>
                <SelectTrigger id="new-list-category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                  <SelectItem value={NONE}>Sin categoría</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit">Crear lista</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
