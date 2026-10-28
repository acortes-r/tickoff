import { useState } from 'react'
import { PencilIcon, PlusIcon, StarIcon, Trash2Icon } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createStore, deleteStore, renameStore, setDefaultStore } from '@/data/stores'
import type { StoreDoc } from '@/data/types'
import { db } from '@/firebase'
import { useAuth } from '@/hooks/useAuth'
import { useStores } from '@/hooks/useStores'
import { reportWriteError } from '@/hooks/useSyncState'

export default function StoresScreen() {
  const { user } = useAuth()
  const uid = user!.uid
  const { stores, defaultStoreId } = useStores(uid)
  const [creating, setCreating] = useState(false)
  const [renaming, setRenaming] = useState<StoreDoc | null>(null)
  const [deleting, setDeleting] = useState<StoreDoc | null>(null)

  return (
    <main className="mx-auto flex max-w-[480px] flex-col gap-6 px-4 py-6">
      <ScreenHeader
        title="Tiendas"
        back="/settings"
        backLabel="Ajustes"
        action={
          <Button onClick={() => setCreating(true)}>
            <PlusIcon data-icon="inline-start" />
            Nueva tienda
          </Button>
        }
      />
      <p className="text-sm text-muted-foreground">
        Se sugieren al agregar productos. La default se usa cuando un producto es nuevo.
      </p>

      <ul className="flex flex-col divide-y rounded-lg border">
        {stores.map((store) => {
          const isDefault = store.id === defaultStoreId
          return (
            <li key={store.id} className="flex min-h-14 items-center justify-between gap-2 px-4 py-2">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate">{store.name}</span>
                {isDefault && <Badge variant="secondary">Default</Badge>}
              </span>
              <span className="flex shrink-0 gap-1">
                {!isDefault && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Hacer default ${store.name}`}
                    onClick={() => setDefaultStore(db, uid, store.id).catch(reportWriteError)}
                  >
                    <StarIcon />
                  </Button>
                )}
                <Button variant="ghost" size="icon" aria-label={`Renombrar ${store.name}`} onClick={() => setRenaming(store)}>
                  <PencilIcon />
                </Button>
                {!isDefault && (
                  <Button variant="ghost" size="icon" aria-label={`Borrar ${store.name}`} onClick={() => setDeleting(store)}>
                    <Trash2Icon />
                  </Button>
                )}
              </span>
            </li>
          )
        })}
      </ul>

      <NameDialog
        open={creating}
        onOpenChange={setCreating}
        title="Nueva tienda"
        onSave={(name) => createStore(db, uid, name).catch(reportWriteError)}
      />
      <NameDialog
        open={renaming !== null}
        onOpenChange={(open) => !open && setRenaming(null)}
        title="Renombrar tienda"
        description="Los productos que ya tienen esta tienda conservan el nombre anterior."
        initialName={renaming?.name}
        onSave={(name) => renaming && renameStore(db, uid, renaming.id, name).catch(reportWriteError)}
      />
      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar “{deleting?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Sale de tu catálogo. Los productos que ya la tienen la conservan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => deleting && deleteStore(db, uid, deleting.id).catch(reportWriteError)}
            >
              Borrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}
