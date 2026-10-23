import { useMemo, useRef, useState } from 'react'
import { PlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { NewItem } from '@/data/items'
import type { ItemDoc, ItemKind, ProductDoc } from '@/data/types'
import { findDuplicate, suggestStore } from '@/domain/items'
import { cleanName, normalizeName } from '@/domain/text'

const NO_STORE = '__none__'
const MAX_SUGGESTIONS = 5

/**
 * Campo siempre visible para agregar rápido: Enter agrega y deja el foco listo
 * para el siguiente. La pestaña activa decide si es algo por comprar o por hacer.
 */
export function CaptureBar({
  kind,
  items,
  products,
  storeOptions,
  defaultStoreName,
  onAdd,
  onDuplicate,
}: {
  kind: ItemKind
  items: ItemDoc[]
  products: ProductDoc[]
  storeOptions: string[]
  defaultStoreName: string | null
  onAdd: (item: NewItem) => void
  onDuplicate: (item: ItemDoc) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')
  // undefined = tienda automática (la sugerida); null = sin tienda.
  const [store, setStore] = useState<string | null | undefined>(undefined)
  const [duplicate, setDuplicate] = useState(false)

  const key = normalizeName(name)
  const product = useMemo(() => products.find((p) => normalizeName(p.name) === key), [products, key])
  const suggestions = useMemo(
    () =>
      kind === 'buy' && key
        ? products.filter((p) => normalizeName(p.name).startsWith(key) && normalizeName(p.name) !== key).slice(0, MAX_SUGGESTIONS)
        : [],
    [kind, key, products],
  )
  const resolvedStore = store === undefined ? suggestStore(product, defaultStoreName) : store
  const options = resolvedStore && !storeOptions.includes(resolvedStore) ? [...storeOptions, resolvedStore] : storeOptions

  function submit(e: React.FormEvent) {
    e.preventDefault()
    inputRef.current?.focus()
    const clean = cleanName(name)
    if (!clean) return
    const existing = findDuplicate(items, kind, clean)
    if (existing) {
      setDuplicate(true)
      onDuplicate(existing)
      return
    }
    onAdd(
      kind === 'buy'
        ? { kind, name: clean, quantity: quantity.trim() || undefined, storeName: resolvedStore }
        : { kind, name: clean, note: note.trim() || undefined },
    )
    setName('')
    setQuantity('')
    setNote('')
    setStore(undefined)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2" noValidate>
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          aria-label="Agregar"
          placeholder={kind === 'buy' ? 'Agregar algo por comprar' : 'Agregar algo por hacer'}
          value={name}
          autoComplete="off"
          enterKeyHint="done"
          onChange={(e) => {
            setName(e.target.value)
            setDuplicate(false)
          }}
        />
        <Button type="submit" size="icon" aria-label="Agregar elemento">
          <PlusIcon />
        </Button>
      </div>

      {duplicate && (
        <p role="status" className="text-sm text-muted-foreground">
          Ya está en la lista
        </p>
      )}

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Sugerencias">
          {suggestions.map((p) => (
            <Button
              key={p.id}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setName(p.name)
                setDuplicate(false)
                inputRef.current?.focus()
              }}
            >
              {p.name}
            </Button>
          ))}
        </div>
      )}

      {kind === 'buy' ? (
        <div className="flex gap-2">
          <Input
            aria-label="Cantidad"
            placeholder="Cantidad (opcional)"
            className="w-36"
            value={quantity}
            maxLength={200}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <Select value={resolvedStore ?? NO_STORE} onValueChange={(v) => setStore(v === NO_STORE ? null : v)}>
            <SelectTrigger aria-label="Tienda" className="min-w-0 flex-1">
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
        </div>
      ) : (
        <Input
          aria-label="Nota"
          placeholder="Nota (opcional)"
          value={note}
          maxLength={200}
          onChange={(e) => setNote(e.target.value)}
        />
      )}
    </form>
  )
}
