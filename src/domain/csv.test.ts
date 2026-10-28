import { toCsv } from './csv'

test('quotes fields with commas', () => {
  expect(toCsv(['a'], [['x,y']])).toContain('"x,y"')
})

test('doubles quotes inside quoted fields', () => {
  expect(toCsv(['a'], [['He said "hi"']])).toContain('"He said ""hi"""')
})

test('quotes multi-line notes', () => {
  expect(toCsv(['a'], [['uno\ndos']])).toContain('"uno\ndos"')
})

test('starts with a BOM, uses CRLF, null is empty, numbers as-is', () => {
  const csv = toCsv(['nombre', 'n', 'nota'], [['Jardín', 3, null]])
  expect(csv.startsWith('﻿')).toBe(true)
  expect(csv).toBe('﻿nombre,n,nota\r\nJardín,3,\r\n')
})
