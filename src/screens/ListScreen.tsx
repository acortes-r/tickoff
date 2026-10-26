import { useEffect, useMemo, useRef, useState } from 'react'
import { EllipsisIcon, HistoryIcon, UserPlusIcon } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router'
import { Avatar } from '@/components/Avatar'
import { CaptureBar } from '@/components/CaptureBar'
import { ItemEditor } from '@/components/ItemEditor'
import { ItemRow } from '@/components/ItemRow'
import { NameDialog } from '@/components/NameDialog'
import { ScreenHeader } from '@/components/ScreenHeader'
import { StoreChips } from '@/components/StoreChips'
import { TabBar } from '@/components/TabBar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { closeItems, undoClose } from '@/data/history'
import { addItem, deleteItem, toggleItem, updateItem, type Actor } from '@/data/items'
import { renameList, setLastTab, setListCategory } from '@/data/lists'
import type { ItemDoc, ItemKind } from '@/data/types'
import { setLastListId } from '@/data/users'
import { filterByStore, sortItems, storeChips, storeOptions as buildStoreOptions } from '@/domain/items'
import { db } from '@/firebase'
import { useAuth } from '@/hooks/useAuth'
import { useCategories } from '@/hooks/useCategories'
import { useItems } from '@/hooks/useItems'
import { useList } from '@/hooks/useList'
import { useListPrefs } from '@/hooks/useListPrefs'
import { useProducts } from '@/hooks/useProducts'
import { useStores } from '@/hooks/useStores'
import { useUserDoc } from '@/hooks/useUserDoc'
import { showSaveError } from '@/lib/saveError'
import { showUndoToast } from '@/lib/undoToast'

const NONE = 'none'
const HIGHLIGHT_MS = 1500

function CategoryDialog({
  open,
  onOpenChange,
  current,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  current: string | null
  onSave: (categoryId: string | null) => void
}) {
  const { user } = useAuth()
  const categories = useCategories(user?.uid ?? null)
  const [value, setValue] = useState(current ?? NONE)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar categoría</DialogTitle>
          <DialogDescription>Solo cambia para ti; los demás miembros eligen la suya.</DialogDescription>
        </DialogHeader>
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger aria-label="Categoría" className="w-full">
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
        <DialogFooter>
          <Button
            onClick={() => {
              onSave(value === NONE ? null : value)
              onOpenChange(false)
            }}
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function ListScreen() {
  const { listId = '' } = useParams()
  const { user } = useAuth()
  const uid = user!.uid
  const userDoc = useUserDoc()
  const list = useList(listId)
  const items = useItems(listId)
  const products = useProducts(listId)
  const prefs = useListPrefs(uid)[listId]
  const { stores, defaultStoreId } = useStores(uid)

  const [tab, setTab] = useState<ItemKind | null>(null)
  const [editing, setEditing] = useState<ItemDoc | null>(null)
  // Desde el historial se puede llegar señalando un elemento ya pendiente.
  const location = useLocation()
  const [highlightId, setHighlightId] = useState<string | null>(
    (location.state as { highlight?: string } | null)?.highlight ?? null,
  )
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [categorizing, setCategorizing] = useState(false)
  const [storeFilter, setStoreFilter] = useState<string | null>(null)
  // Evita que un doble toque cierre la misma compra dos veces. El ref cambia al
  // instante (dos clics seguidos llegan antes de volver a renderizar); el estado
  // deshabilita el botón.
  const closingRef = useRef(false)
  const [closing, setClosing] = useState(false)

  const activeTab = tab ?? prefs?.lastTab ?? 'buy'
  const by: Actor = { uid, name: userDoc?.displayName ?? user?.displayName ?? 'Sin nombre' }
  const defaultStoreName = stores.find((s) => s.id === defaultStoreId)?.name ?? null
  const storeOptions = useMemo(() => buildStoreOptions(stores, items), [stores, items])
  const chips = useMemo(() => storeChips(items), [items])
  // Si la tienda filtrada ya no tiene nada, se vuelve a "Todas".
  const activeFilter = activeTab === 'buy' && chips.some((c) => c.key === storeFilter) ? storeFilter : null
  const visible = useMemo(
    () => sortItems(filterByStore(items.filter((i) => i.kind === activeTab), activeFilter)),
    [items, activeTab, activeFilter],
  )
  const doneVisible = visible.filter((i) => i.status === 'done')
  const counts = useMemo(
    () => ({
      buy: items.filter((i) => i.kind === 'buy' && i.status === 'pending').length,
      do: items.filter((i) => i.kind === 'do' && i.status === 'pending').length,
    }),
    [items],
  )

  // Abrir la lista la vuelve la última usada.
  useEffect(() => {
    if (list) setLastListId(db, uid, listId).catch(showSaveError)
  }, [list?.id, uid, listId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!highlightId) return
    document.getElementById(`row-${highlightId}`)?.scrollIntoView({ block: 'nearest' })
    const timer = setTimeout(() => setHighlightId(null), HIGHLIGHT_MS)
    return () => clearTimeout(timer)
  }, [highlightId])

  if (list === undefined) return null
  if (list === null) {
    return (
      <main className="mx-auto flex max-w-[480px] flex-col gap-6 px-4 py-6">
        <ScreenHeader title="Lista no disponible" back="/" backLabel="Inicio" />
        <p className="text-muted-foreground">Esta lista ya no existe o ya no tienes acceso.</p>
      </main>
    )
  }

  const isOwner = list.ownerId === uid

  // Cierra los tachados visibles (respeta el filtro de tienda) y ofrece deshacer.
  async function closeVisible() {
    if (closingRef.current) return
    closingRef.current = true
    setClosing(true)
    try {
      const result = await closeItems(db, listId, by, activeTab, doneVisible, products)
      if (!result) return
      result.written.catch(showSaveError)
      showUndoToast(activeTab === 'buy' ? 'Compra cerrada' : 'Hechos archivados', () =>
        undoClose(db, listId, result.entryId).catch(showSaveError),
      )
    } catch (err) {
      showSaveError(err)
    } finally {
      closingRef.current = false
      setClosing(false)
    }
  }
  const members = Object.entries(list.members)

  return (
    <main className="mx-auto flex max-w-[480px] flex-col gap-4 px-4 py-6">
      <ScreenHeader
        title={list.name}
        back="/"
        backLabel="Inicio"
        action={
          <span className="flex shrink-0 items-center">
            {members.length > 1 && (
              <span className="mr-1 flex -space-x-1.5">
                {members.map(([id, m]) => (
                  <Avatar key={id} name={m.displayName} photoURL={m.photoURL} />
                ))}
              </span>
            )}
            <Button variant="ghost" size="icon" asChild>
              <Link to={`/l/${listId}/history`} aria-label="Historial">
                <HistoryIcon />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <Link to={`/l/${listId}/share`} aria-label="Compartir">
                <UserPlusIcon />
              </Link>
            </Button>
            <Popover open={menuOpen} onOpenChange={setMenuOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Más opciones">
                  <EllipsisIcon />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="flex w-52 flex-col p-1">
                <Button
                  variant="ghost"
                  className="justify-start"
                  onClick={() => {
                    setMenuOpen(false)
                    setCategorizing(true)
                  }}
                >
                  Cambiar categoría
                </Button>
                {isOwner && (
                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => {
                      setMenuOpen(false)
                      setRenaming(true)
                    }}
                  >
                    Renombrar
                  </Button>
                )}
              </PopoverContent>
            </Popover>
          </span>
        }
      />

      <TabBar
        value={activeTab}
        counts={counts}
        onChange={(next) => {
          setTab(next)
          setLastTab(db, uid, listId, next).catch(showSaveError)
        }}
      />

      {activeTab === 'buy' && <StoreChips chips={chips} value={activeFilter} onChange={setStoreFilter} />}

      <CaptureBar
        kind={activeTab}
        items={items}
        products={products}
        storeOptions={storeOptions}
        defaultStoreName={defaultStoreName}
        onAdd={(input) => addItem(db, listId, by, input).catch(showSaveError)}
        onDuplicate={(item) => setHighlightId(item.id)}
      />

      {visible.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          {activeTab === 'buy' ? 'Nada por comprar.' : 'Nada por hacer.'}
        </p>
      ) : (
        <ul className="flex flex-col">
          {visible.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              highlighted={item.id === highlightId}
              onToggle={() => toggleItem(db, listId, item, by).catch(showSaveError)}
              onEdit={() => setEditing(item)}
            />
          ))}
        </ul>
      )}

      {doneVisible.length > 0 && (
        <div className="sticky bottom-4 flex justify-end pb-[env(safe-area-inset-bottom)]">
          <Button size="lg" onClick={closeVisible} disabled={closing}>
            {activeTab === 'buy' ? 'Terminar compra' : 'Archivar hechos'}
          </Button>
        </div>
      )}

      <ItemEditor
        item={editing}
        storeOptions={storeOptions}
        onClose={() => setEditing(null)}
        onSave={(changes) => editing && updateItem(db, listId, editing.id, changes).catch(showSaveError)}
        onDelete={() => editing && deleteItem(db, listId, editing.id).catch(showSaveError)}
      />
      <NameDialog
        open={renaming}
        onOpenChange={setRenaming}
        title="Renombrar lista"
        description="Los miembros verán el nombre nuevo."
        initialName={list.name}
        onSave={(name) => renameList(db, listId, name).catch(showSaveError)}
      />
      {categorizing && (
        <CategoryDialog
          open
          onOpenChange={setCategorizing}
          current={prefs?.categoryId ?? null}
          onSave={(categoryId) => setListCategory(db, uid, listId, categoryId).catch(showSaveError)}
        />
      )}
    </main>
  )
}
