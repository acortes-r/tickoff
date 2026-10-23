import { Timestamp } from 'firebase/firestore'
import type { ItemDoc, ProductDoc, StoreDoc } from '@/data/types'
import { findDuplicate, sortItems, storeOptions, suggestStore } from './items'

const t = (ms: number) => Timestamp.fromMillis(ms)
let seq = 0
function item(patch: Partial<ItemDoc>): ItemDoc {
  seq += 1
  return {
    id: `i${seq}`,
    kind: 'buy',
    name: 'Cosa',
    normalizedName: 'cosa',
    status: 'pending',
    addedBy: 'alice',
    addedByName: 'Ana Prueba',
    createdAt: t(seq),
    updatedAt: t(seq),
    ...patch,
  }
}

describe('sortItems', () => {
  test('hides closed items and puts pending before done', () => {
    const items = [
      item({ id: 'done-old', status: 'done', updatedAt: t(10) }),
      item({ id: 'pending-old', createdAt: t(1) }),
      item({ id: 'closed', status: 'closed' }),
      item({ id: 'done-new', status: 'done', updatedAt: t(20) }),
      item({ id: 'pending-new', createdAt: t(5) }),
    ]
    expect(sortItems(items).map((i) => i.id)).toEqual(['pending-new', 'pending-old', 'done-new', 'done-old'])
  })
})

describe('findDuplicate', () => {
  const leche = item({ id: 'leche', name: 'Leche', normalizedName: 'leche' })
  const items = [
    leche,
    item({ id: 'do-leche', kind: 'do', name: 'leche', normalizedName: 'leche' }),
    item({ id: 'closed-pan', name: 'Pan', normalizedName: 'pan', status: 'closed' }),
    item({ id: 'done-huevo', name: 'Huevo', normalizedName: 'huevo', status: 'done' }),
  ]

  test('finds a pending item ignoring case, accents and spaces', () => {
    expect(findDuplicate(items, 'buy', 'LECHE ')).toBe(leche)
    expect(findDuplicate([item({ name: 'Jamón', normalizedName: 'jamon' })], 'buy', 'jamon')?.name).toBe('Jamón')
  })

  test('ignores the other tab, closed items and done items', () => {
    expect(findDuplicate(items, 'do', 'Leche')?.id).toBe('do-leche')
    expect(findDuplicate(items, 'buy', 'Pan')).toBeNull()
    expect(findDuplicate(items, 'buy', 'Huevo')).toBeNull()
  })
})

describe('suggestStore', () => {
  const product = (lastStoreName: string | null): ProductDoc => ({
    id: 'leche',
    name: 'Leche',
    lastStoreName,
    timesPurchased: 1,
  })

  test('prefers where the product was last time', () => {
    expect(suggestStore(product('Mercado'), 'Super')).toBe('Mercado')
  })

  test('falls back to the default store for new products', () => {
    expect(suggestStore(undefined, 'Super')).toBe('Super')
    expect(suggestStore(product(null), 'Super')).toBe('Super')
    expect(suggestStore(undefined, null)).toBeNull()
  })
})

describe('storeOptions', () => {
  const store = (name: string): StoreDoc => ({ id: name, name, createdAt: t(0) })

  test('merges own stores and list stores ignoring case, sorted', () => {
    const items = [
      item({ storeName: 'walmart' }),
      item({ storeName: 'Tianguis' }),
      item({ storeName: null }),
      item({ kind: 'do', storeName: 'Oculta' }),
    ]
    expect(storeOptions([store('Walmart'), store('Super')], items)).toEqual(['Super', 'Tianguis', 'Walmart'])
  })
})
