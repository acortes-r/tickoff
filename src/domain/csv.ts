type Cell = string | number | null

function field(value: Cell): string {
  if (value === null) return ''
  const text = String(value)
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

/**
 * CSV según RFC 4180 (comas, CRLF, comillas dobladas). Empieza con BOM para
 * que Excel lo abra en UTF-8 y respete los acentos.
 */
export function toCsv(headers: string[], rows: Cell[][]): string {
  return '﻿' + [headers, ...rows].map((row) => row.map(field).join(',') + '\r\n').join('')
}
