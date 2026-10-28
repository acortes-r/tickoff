type Cell = string | number | null

// Un texto que empieza así Excel lo ejecuta como fórmula (p. ej. un elemento
// llamado "=HYPERLINK(…)" que agregó otro miembro). El apóstrofo lo deja como texto.
const FORMULA_START = /^[=+\-@\t\r]/

function field(value: Cell): string {
  if (value === null) return ''
  const text = typeof value === 'string' && FORMULA_START.test(value) ? `'${value}` : String(value)
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

/**
 * CSV según RFC 4180 (comas, CRLF, comillas dobladas). Empieza con BOM para
 * que Excel lo abra en UTF-8 y respete los acentos; los textos que parecen
 * fórmula llevan un apóstrofo adelante.
 */
export function toCsv(headers: string[], rows: Cell[][]): string {
  return '﻿' + [headers, ...rows].map((row) => row.map(field).join(',') + '\r\n').join('')
}
