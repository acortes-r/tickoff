import { createElement, useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { CategoryChip } from '@/components/CategoryChip'
import { NameDialog } from '@/components/NameDialog'
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
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { FieldLegend, FieldSet } from '@/components/ui/field'
import { createCategory, deleteCategory, reorderCategories, updateCategory } from '@/data/categories'
import type { CategoryDoc } from '@/data/types'
import { db } from '@/firebase'
import { useAuth } from '@/hooks/useAuth'
import { useCategories } from '@/hooks/useCategories'
import { CATEGORY_ICON_LABELS, CATEGORY_ICONS } from '@/lib/categoryIcons'
import { reportWriteError } from '@/hooks/useSyncState'
import { CATEGORY_TONES } from '@/lib/tones'

const optionClass =
  'flex size-11 cursor-pointer items-center justify-center rounded-md border border-transparent outline-none has-checked:border-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring/50'

function Choices({
  legend,
  name,
  value,
  onChange,
  options,
}: {
  legend: string
  name: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string; content: React.ReactNode; style?: React.CSSProperties }[]
}) {
  return (
    <FieldSet>
      <FieldLegend variant="label">{legend}</FieldLegend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o.value} className={optionClass} style={o.style}>
            <input
              type="radio"
              name={name}
              value={o.value}
              aria-label={o.label}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.content}
          </label>
        ))}
      </div>
    </FieldSet>
  )
}

/** Crear o editar: nombre, ícono y tono. */
function CategoryDialog({
  category,
  open,
  onOpenChange,
  onSave,
}: {
  category: CategoryDoc | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (input: { name: string; icon: string; color: string }) => void
}) {
  const [icon, setIcon] = useState(category?.icon ?? 'tag')
  const [color, setColor] = useState(category?.color ?? CATEGORY_TONES[0].id)

  return (
    <NameDialog
      open={open}
      onOpenChange={onOpenChange}
      title={category ? 'Editar categoría' : 'Nueva categoría'}
      initialName={category?.name}
      onSave={(name) => onSave({ name, icon, color })}
    >
      <Choices
        legend="Ícono"
        name="category-icon"
        value={icon}
        onChange={setIcon}
        options={Object.entries(CATEGORY_ICONS).map(([key, Icon]) => ({
          value: key,
          label: CATEGORY_ICON_LABELS[key] ?? key,
          content: createElement(Icon, { className: 'size-5' }),
        }))}
      />
      <Choices
        legend="Tono"
        name="category-tone"
        value={color}
        onChange={setColor}
        options={CATEGORY_TONES.map((tone, i) => ({
          value: tone.id,
          label: `Tono ${i + 1}`,
          content: <span className="size-6 rounded-sm" style={{ background: tone.bg }} />,
        }))}
      />
    </NameDialog>
  )
}

export default function CategoriesScreen() {
  const { user } = useAuth()
  const uid = user!.uid
  const categories = useCategories(uid)
  // editing: undefined = cerrado, null = nueva, CategoryDoc = editar esa.
  const [editing, setEditing] = useState<CategoryDoc | null | undefined>(undefined)
  const [deleting, setDeleting] = useState<CategoryDoc | null>(null)

  function move(index: number, delta: number) {
    const ids = categories.map((c) => c.id)
    ;[ids[index], ids[index + delta]] = [ids[index + delta], ids[index]]
    reorderCategories(db, uid, ids).catch(reportWriteError)
  }

  return (
    <main className="mx-auto flex max-w-[480px] flex-col gap-6 px-4 py-6">
      <ScreenHeader
        title="Categorías"
        back="/settings"
        backLabel="Ajustes"
        action={
          <Button onClick={() => setEditing(null)}>
            <PlusIcon data-icon="inline-start" />
            Nueva categoría
          </Button>
        }
      />
      <p className="text-sm text-muted-foreground">Agrupan tus listas en Inicio. Son solo tuyas.</p>

      <ul className="flex flex-col divide-y rounded-lg border">
        {categories.map((category, i) => (
          <li key={category.id} className="flex min-h-14 items-center justify-between gap-2 py-2 pr-2 pl-4">
            <span className="flex min-w-0 items-center gap-3">
              <CategoryChip category={category} />
              <span className="truncate">{category.name}</span>
            </span>
            <span className="flex shrink-0">
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Subir ${category.name}`}
                disabled={i === 0}
                onClick={() => move(i, -1)}
              >
                <ChevronUpIcon />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Bajar ${category.name}`}
                disabled={i === categories.length - 1}
                onClick={() => move(i, 1)}
              >
                <ChevronDownIcon />
              </Button>
              <Button variant="ghost" size="icon" aria-label={`Editar ${category.name}`} onClick={() => setEditing(category)}>
                <PencilIcon />
              </Button>
              <Button variant="ghost" size="icon" aria-label={`Borrar ${category.name}`} onClick={() => setDeleting(category)}>
                <Trash2Icon />
              </Button>
            </span>
          </li>
        ))}
      </ul>

      {editing !== undefined && (
        <CategoryDialog
          key={editing?.id ?? 'new'}
          category={editing}
          open
          onOpenChange={(open) => !open && setEditing(undefined)}
          onSave={(input) =>
            (editing ? updateCategory(db, uid, editing.id, input) : createCategory(db, uid, input)).catch(
              reportWriteError,
            )
          }
        />
      )}
      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar “{deleting?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>Sus listas pasan a “Sin categoría”. No se borra ninguna lista.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => deleting && deleteCategory(db, uid, deleting.id).catch(reportWriteError)}
            >
              Borrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}
