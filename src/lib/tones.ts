// Tonos apagados para chips de icono de categoría. Los valores viven en
// src/index.css (--tone-N y --tone-N-fg, claro y oscuro); cada fg sobre su bg
// cumple WCAG AA.
export const CATEGORY_TONES = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
  id: `tone-${n}`,
  bg: `var(--tone-${n})`,
  fg: `var(--tone-${n}-fg)`,
})) as readonly { id: string; bg: string; fg: string }[]
