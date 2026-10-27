import { Timestamp } from 'firebase/firestore'
import type { ActivityDoc, ListPrefsDoc } from '@/data/types'
import {
  describeGroup,
  describeSummary,
  groupActivity,
  openSummary,
  unreadCount,
  unseenByList,
  type ActivityGroup,
  type ListActivity,
} from './activity'

const MIN = 60 * 1000
const BASE = Date.UTC(2026, 9, 27, 12, 0)
let seq = 0
function act(patch: Partial<ActivityDoc> & { listId?: string; minutes?: number }): ListActivity {
  seq += 1
  const { listId = 'despensa', minutes = 0, ...rest } = patch
  return {
    id: `a${seq}`,
    type: 'added',
    actorUid: 'bob',
    actorName: 'Beto Prueba',
    at: Timestamp.fromMillis(BASE + minutes * MIN),
    itemName: `Cosa ${seq}`,
    listId,
    listName: listId === 'despensa' ? 'Despensa' : 'Jardín',
    ...rest,
  }
}
const prefs = (lastSeen: Record<string, number>): Record<string, ListPrefsDoc> =>
  Object.fromEntries(
    Object.entries(lastSeen).map(([id, minutes]) => [
      id,
      { id, lastTab: 'buy', lastSeenAt: Timestamp.fromMillis(BASE + minutes * MIN) },
    ]),
  )

describe('groupActivity', () => {
  test('five adds by the same person within 20 minutes are one notice', () => {
    const entries = [0, 5, 10, 15, 20].map((minutes) => act({ minutes }))
    const groups = groupActivity(entries, 'alice')
    expect(groups).toHaveLength(1)
    expect(groups[0]).toMatchObject({ listId: 'despensa', actorName: 'Beto Prueba', type: 'added', count: 5 })
    expect(groups[0].itemNames).toHaveLength(5)
    expect(groups[0].latestAt.getTime()).toBe(BASE + 20 * MIN)
  })

  test('40 minutes apart makes two notices, newest first', () => {
    const groups = groupActivity([act({ minutes: 0 }), act({ minutes: 40 })], 'alice')
    expect(groups.map((g) => g.latestAt.getTime())).toEqual([BASE + 40 * MIN, BASE])
  })

  test('different person, action or list are separate notices', () => {
    const groups = groupActivity(
      [act({}), act({ actorUid: 'carol', actorName: 'Caro Prueba' }), act({ type: 'done' }), act({ listId: 'jardin' })],
      'alice',
    )
    expect(groups).toHaveLength(4)
  })

  test('a close counts its items', () => {
    const groups = groupActivity([act({ type: 'closed', count: 3, itemName: undefined })], 'alice')
    expect(groups[0].count).toBe(3)
  })

  test('my own actions never show up', () => {
    expect(groupActivity([act({ actorUid: 'alice' })], 'alice')).toEqual([])
  })
})

describe('unseenByList', () => {
  test('flags a list only when someone else did something after I last opened it', () => {
    const entries = [act({ minutes: 10 }), act({ listId: 'jardin', minutes: 10 }), act({ listId: 'jardin', minutes: 30, actorUid: 'alice' })]
    expect(unseenByList(entries, 'alice', prefs({ despensa: 5, jardin: 20 }))).toEqual(new Set(['despensa']))
  })

  test('a list I never opened counts any activity', () => {
    expect(unseenByList([act({ listId: 'jardin' })], 'alice', {})).toEqual(new Set(['jardin']))
  })
})

describe('unreadCount', () => {
  test('counts notices newer than the last time the bell was opened', () => {
    const entries = [act({ minutes: 0 }), act({ minutes: 60, type: 'done' })]
    expect(unreadCount(entries, 'alice', null)).toBe(2)
    expect(unreadCount(entries, 'alice', new Date(BASE + 30 * MIN))).toBe(1)
    expect(unreadCount(entries, 'alice', new Date(BASE + 90 * MIN))).toBe(0)
  })
})

describe('openSummary', () => {
  test('per unseen list: who, how many added and how many ticked (closes count their items)', () => {
    const entries = [
      act({ minutes: 10 }),
      act({ minutes: 11 }),
      act({ minutes: 12, type: 'done' }),
      act({ minutes: 13, type: 'closed', count: 4, actorUid: 'carol', actorName: 'Caro Prueba' }),
      act({ minutes: 1 }),
      act({ listId: 'jardin', minutes: 2 }),
    ]
    expect(openSummary(entries, 'alice', prefs({ despensa: 5, jardin: 5 }))).toEqual([
      { listId: 'despensa', listName: 'Despensa', actorNames: ['Beto Prueba', 'Caro Prueba'], added: 2, done: 5 },
    ])
  })
})

describe('describeGroup', () => {
  const group = (patch: Partial<ActivityGroup>): ActivityGroup => ({
    listId: 'despensa',
    listName: 'Despensa',
    actorName: 'Beto Prueba',
    type: 'added',
    count: 1,
    itemNames: ['Leche'],
    latestAt: new Date(BASE),
    ...patch,
  })

  test.each([
    [{}, 'Beto Prueba agregó Leche a Despensa'],
    [{ count: 5, itemNames: ['a', 'b', 'c', 'd', 'e'] }, 'Beto Prueba agregó 5 elementos a Despensa'],
    [{ type: 'done' }, 'Beto Prueba tachó Leche en Despensa'],
    [{ type: 'done', count: 2 }, 'Beto Prueba tachó 2 elementos en Despensa'],
    [{ type: 'deleted' }, 'Beto Prueba borró Leche de Despensa'],
    [{ type: 'closed', count: 3, itemNames: [] }, 'Beto Prueba terminó una compra de 3 elementos en Despensa'],
    [{ type: 'closed', count: 1, itemNames: [] }, 'Beto Prueba terminó una compra de 1 elemento en Despensa'],
    [{ type: 'archived', count: 2, itemNames: [] }, 'Beto Prueba archivó 2 hechos en Despensa'],
    [{ type: 'joined', itemNames: [] }, 'Beto Prueba se unió a Despensa'],
    [{ type: 'left', itemNames: [] }, 'Beto Prueba salió de Despensa'],
  ] as [Partial<ActivityGroup>, string][])('%o → %s', (patch, text) => {
    expect(describeGroup(group(patch))).toBe(text)
  })
})

describe('describeSummary', () => {
  test('one person, with counts', () => {
    expect(
      describeSummary({ listId: 'd', listName: 'Despensa', actorNames: ['Beto Prueba'], added: 3, done: 2 }),
    ).toBe('Beto Prueba actualizó Despensa: 3 agregados, 2 tachados')
  })

  test('two people, only ticks', () => {
    expect(
      describeSummary({ listId: 'd', listName: 'Despensa', actorNames: ['Beto Prueba', 'Caro Prueba'], added: 0, done: 1 }),
    ).toBe('Beto Prueba y Caro Prueba actualizaron Despensa: 1 tachado')
  })

  test('other changes only', () => {
    expect(describeSummary({ listId: 'd', listName: 'Despensa', actorNames: ['Beto Prueba'], added: 0, done: 0 })).toBe(
      'Beto Prueba actualizó Despensa',
    )
  })
})
