import type { RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, setDoc, Timestamp } from 'firebase/firestore'
import { collectExport, historyCsv, itemsCsv } from '../../src/data/export'
import { asUser, getTestEnv, seed } from './setup'

let env: RulesTestEnvironment

const when = Timestamp.fromDate(new Date('2026-10-01T15:00:00Z'))
const member = (name: string) => ({ displayName: name, photoURL: null })

beforeAll(async () => {
  env = await getTestEnv()
})
beforeEach(async () => {
  await env.clearFirestore()
  await seed(async (db) => {
    await setDoc(doc(db, 'users/alice/categories/c1'), { name: 'Casa', icon: 'house', color: 'tone-1', order: 0 })
    await setDoc(doc(db, 'users/alice/stores/s1'), { name: 'Super', createdAt: when })
    await setDoc(doc(db, 'lists/own'), {
      name: 'Despensa',
      ownerId: 'alice',
      memberIds: ['alice'],
      members: { alice: member('Ana Prueba') },
      createdAt: when,
    })
    await setDoc(doc(db, 'lists/own/items/i1'), {
      kind: 'buy',
      name: 'Leche, entera',
      normalizedName: 'leche, entera',
      quantity: '2',
      storeName: 'Super',
      status: 'pending',
      addedBy: 'alice',
      addedByName: 'Ana Prueba',
      createdAt: when,
      updatedAt: when,
    })
    await setDoc(doc(db, 'lists/own/history/h1'), {
      kind: 'purchase',
      closedAt: when,
      closedBy: 'alice',
      closedByName: 'Ana Prueba',
      items: [
        {
          itemId: 'i0',
          kind: 'buy',
          name: 'Pan',
          storeName: 'Super',
          addedByName: 'Ana Prueba',
          doneByName: 'Ana Prueba',
          prevLastPurchasedAt: null,
        },
      ],
    })
    await setDoc(doc(db, 'lists/shared'), {
      name: 'Casa',
      ownerId: 'bob',
      memberIds: ['bob', 'alice'],
      members: { bob: member('Beto Prueba'), alice: member('Ana Prueba') },
      createdAt: when,
    })
    await setDoc(doc(db, 'lists/shared/items/i2'), {
      kind: 'do',
      name: 'Pintar',
      normalizedName: 'pintar',
      note: 'blanco\nmate',
      status: 'done',
      addedBy: 'bob',
      addedByName: 'Beto Prueba',
      doneBy: 'alice',
      doneByName: 'Ana Prueba',
      createdAt: when,
      updatedAt: when,
    })
    await setDoc(doc(db, 'lists/private'), {
      name: 'Secreta',
      ownerId: 'bob',
      memberIds: ['bob'],
      members: { bob: member('Beto Prueba') },
      createdAt: when,
    })
  })
})
afterAll(() => env.cleanup())

test('collectExport includes own and shared lists with items and history, not others', async () => {
  const data = await collectExport(asUser('alice'), 'alice')
  expect(data.lists.map((l) => l.name).sort()).toEqual(['Casa', 'Despensa'])
  const own = data.lists.find((l) => l.id === 'own')!
  expect(own.items.map((i) => i.name)).toEqual(['Leche, entera'])
  expect(own.history).toHaveLength(1)
  expect(own.createdAt).toBe('2026-10-01T15:00:00.000Z')
  expect(own.history[0].closedAt).toBe('2026-10-01T15:00:00.000Z')
  expect(data.lists.find((l) => l.id === 'shared')!.items.map((i) => i.name)).toEqual(['Pintar'])
  expect(data.categories.map((c) => c.name)).toEqual(['Casa'])
  expect(data.stores.map((s) => s.name)).toEqual(['Super'])
  expect(Number.isNaN(Date.parse(data.exportedAt))).toBe(false)
})

test('itemsCsv and historyCsv have one row per item with readable values', async () => {
  const data = await collectExport(asUser('alice'), 'alice')
  const items = itemsCsv(data).split('\r\n')
  expect(items[0]).toBe('﻿lista,pestaña,nombre,cantidad,tienda,nota,estado,agregó,completó,creado')
  expect(items).toContain('Despensa,Comprar,"Leche, entera",2,Super,,Pendiente,Ana Prueba,,2026-10-01T15:00:00.000Z')
  expect(itemsCsv(data)).toContain('Casa,Hacer,Pintar,,,"blanco\nmate",Hecho,Beto Prueba,Ana Prueba,')
  const history = historyCsv(data).split('\r\n')
  expect(history[0]).toBe('﻿lista,tipo,cerrado,cerró,nombre,cantidad,tienda,nota')
  expect(history).toContain('Despensa,Compra,2026-10-01T15:00:00.000Z,Ana Prueba,Pan,,Super,')
})
