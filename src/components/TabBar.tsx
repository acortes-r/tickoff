import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ItemKind } from '@/data/types'

/** Pestañas Comprar / Hacer con sus pendientes. Siempre existen las dos. */
export function TabBar({
  value,
  counts,
  onChange,
}: {
  value: ItemKind
  counts: Record<ItemKind, number>
  onChange: (tab: ItemKind) => void
}) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as ItemKind)}>
      <TabsList className="w-full">
        <TabsTrigger value="buy" className="flex-1 pointer-coarse:min-h-11">
          Comprar <span className="text-muted-foreground tabular-nums">{counts.buy}</span>
        </TabsTrigger>
        <TabsTrigger value="do" className="flex-1 pointer-coarse:min-h-11">
          Hacer <span className="text-muted-foreground tabular-nums">{counts.do}</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
