import { cn } from 'cn'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

/** Foto de la persona o sus iniciales. */
export function Avatar({
  name,
  photoURL,
  label = name,
  className,
}: {
  name: string
  photoURL?: string | null
  /** Texto para lectores de pantalla; por default, el nombre. */
  label?: string
  className?: string
}) {
  const base = cn(
    'inline-flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-[10px] font-medium text-muted-foreground',
    className,
  )
  return photoURL ? (
    <img src={photoURL} alt={label} title={label} className={base} referrerPolicy="no-referrer" />
  ) : (
    <span role="img" aria-label={label} title={label} className={base}>
      {initials(name)}
    </span>
  )
}
