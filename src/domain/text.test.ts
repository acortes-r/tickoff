import { cleanName, normalizeName, productDocId } from './text'

describe('normalizeName', () => {
  test('strips accents, lowercases and collapses spaces', () => {
    expect(normalizeName('  Jardín   Café ')).toBe('jardin cafe')
  })

  test('ignores case', () => {
    expect(normalizeName('WALMART')).toBe(normalizeName('walmart'))
  })
})

describe('cleanName', () => {
  test('rejects blank names', () => {
    expect(cleanName('   ')).toBeNull()
  })

  test('rejects names over 200 chars', () => {
    expect(cleanName('a'.repeat(201))).toBeNull()
  })

  test('accepts exactly 200 chars', () => {
    expect(cleanName('a'.repeat(200))).toBe('a'.repeat(200))
  })

  test('trims and collapses spaces, keeping case and accents', () => {
    expect(cleanName('  Leche  entera ')).toBe('Leche entera')
  })
})

describe('productDocId', () => {
  test('never contains a slash', () => {
    expect(productDocId('1/2 kg jamon')).not.toContain('/')
  })

  test.each([
    ['.', 'p_.'],
    ['..', 'p_..'],
    ['__x__', 'p___x__'],
    ['', 'p_'],
  ])('prefixes reserved id %j', (input, expected) => {
    expect(productDocId(input)).toBe(expected)
  })

  test('keeps ordinary names as they are', () => {
    expect(productDocId('leche entera')).toBe('leche entera')
  })
})
