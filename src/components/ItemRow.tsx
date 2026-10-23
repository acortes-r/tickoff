import { PencilIcon } from 'lucide-react'
import { cn } from 'cn'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { ItemDoc } from '@/data/types'

/** Un elemento: toda la fila tacha/destacha; el lápiz abre la edición. */
export function ItemRow({
  item,
  highlighted = false,
  onToggle,
  onEdit,
}: {
  item: ItemDoc
  highlighted?: boolean
  onToggle: () => void
  onEdit: () => void
}) {
  const done = item.status === 'done'
  const checkboxId = `item-${item.id}`
  const nameId = `item-name-${item.id}`
  const detail =
    item.kind === 'buy' ? [item.quantity, item.storeName].filter(Boolean).join(' · ') : (item.note ?? '')

  return (
    <li
      id={`row-${item.id}`}
      className={cn(
        'flex min-h-14 items-center gap-3 rounded-lg pr-1 pl-3 transition-colors duration-500',
        highlighted && 'bg-muted',
      )}
    >
      <Checkbox id={checkboxId} checked={done} onCheckedChange={onToggle} aria-labelledby={nameId} />
      <label htmlFor={checkboxId} className="flex min-w-0 flex-1 cursor-pointer flex-col gap-0.5 py-2">
        <span id={nameId} className={cn('truncate', done && 'text-muted-foreground line-through')}>
          {item.name}
        </span>
        {detail && <span className="truncate text-sm text-muted-foreground">{detail}</span>}
      </label>
      <span className="flex shrink-0 -space-x-1.5">
        <Avatar name={item.addedByName} label={`Agregó ${item.addedByName}`} />
        {done && item.doneByName && <Avatar name={item.doneByName} label={`Completó ${item.doneByName}`} />}
      </span>
      <Button variant="ghost" size="icon" aria-label={`Editar ${item.name}`} onClick={onEdit}>
        <PencilIcon />
      </Button>
    </li>
  )
}
