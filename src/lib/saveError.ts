import { toast } from 'sonner'

/** Aviso genérico para escrituras que se lanzan sin esperar (funcionan sin señal). */
export function showSaveError(err: unknown): void {
  console.error(err)
  toast.error('No se pudo guardar. Inténtalo otra vez.')
}
