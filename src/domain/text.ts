const MAX_NAME = 200

function collapse(s: string): string {
  return s.trim().replace(/\s+/g, ' ')
}

/** Clave de comparación: sin acentos, minúsculas, espacios colapsados. */
export function normalizeName(s: string): string {
  return collapse(s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase())
}

/** Nombre listo para guardar, o null si queda vacío o pasa de 200 caracteres. */
export function cleanName(s: string): string | null {
  const name = collapse(s)
  return name && name.length <= MAX_NAME ? name : null
}

/** Id de documento válido en Firestore para un nombre ya normalizado. */
export function productDocId(normalized: string): string {
  const id = normalized.replaceAll('/', '∕')
  return id === '' || id === '.' || id === '..' || /^__.*__$/.test(id) ? `p_${id}` : id
}
