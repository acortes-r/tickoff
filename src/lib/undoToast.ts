import { toast } from 'sonner'

const UNDO_MS = 10_000

/** Aviso con "Deshacer" durante 10 s, para cerrar compra y archivar hechos. */
export function showUndoToast(message: string, onUndo: () => void): void {
  toast(message, { duration: UNDO_MS, action: { label: 'Deshacer', onClick: onUndo } })
}
