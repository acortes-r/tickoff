import { Button } from '@/components/ui/button'
import type { StoreChip } from '@/domain/items'

/** Filtro del modo super: "Todas" y una chip por tienda de la lista. */
export function StoreChips({
  chips,
  value,
  onChange,
}: {
  chips: StoreChip[]
  value: string | null
  onChange: (key: string | null) => void
}) {
  if (chips.length === 0) return null
  const options = [{ key: null, label: 'Todas' }, ...chips]
  return (
    <div role="group" aria-label="Filtrar por tienda" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {options.map((chip) => (
        <Button
          key={chip.key ?? 'all'}
          type="button"
          size="sm"
          variant={value === chip.key ? 'default' : 'outline'}
          aria-pressed={value === chip.key}
          className="shrink-0"
          onClick={() => onChange(chip.key)}
        >
          {chip.label}
        </Button>
      ))}
    </div>
  )
}
