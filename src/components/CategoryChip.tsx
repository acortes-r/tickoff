import { createElement } from 'react'
import type { CategoryDoc } from '@/data/types'
import { categoryIcon } from '@/lib/categoryIcons'
import { CATEGORY_TONES } from '@/lib/tones'

/** Ícono de la categoría sobre su tono apagado (único lugar donde va color). */
export function CategoryChip({ category, className = 'size-8' }: { category: CategoryDoc; className?: string }) {
  const tone = CATEGORY_TONES.find((t) => t.id === category.color) ?? CATEGORY_TONES[0]
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-md ${className}`}
      style={{ background: tone.bg, color: tone.fg }}
    >
      {createElement(categoryIcon(category.icon), { className: 'size-4' })}
    </span>
  )
}
