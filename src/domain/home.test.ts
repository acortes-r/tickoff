import { Timestamp } from 'firebase/firestore'
import type { CategoryDoc, ListDoc, ListPrefsDoc } from '@/data/types'
import { groupListsByCategory } from './home'

const at = Timestamp.fromMillis(0)
const list = (id: string): ListDoc => ({
  id,
  name: id,
  ownerId: 'alice',
  memberIds: ['alice'],
  members: {},
  createdAt: at,
})
const category = (id: string, order: number): CategoryDoc => ({ id, name: id, icon: 'tag', color: 'tone-1', order })
const prefs = (entries: Record<string, string | null>): Record<string, ListPrefsDoc> =>
  Object.fromEntries(Object.entries(entries).map(([id, categoryId]) => [id, { id, categoryId, lastTab: 'buy' }]))

test('groups lists by category in category order', () => {
  const groups = groupListsByCategory(
    [list('l1'), list('l2'), list('l3')],
    prefs({ l1: 'trabajo', l2: 'despensa', l3: 'despensa' }),
    [category('trabajo', 1), category('despensa', 0)],
  )
  expect(groups.map((g) => [g.category?.id, g.lists.map((l) => l.id)])).toEqual([
    ['despensa', ['l2', 'l3']],
    ['trabajo', ['l1']],
  ])
})

test('lists without a pref or with a deleted category go last, in "Sin categoría"', () => {
  const groups = groupListsByCategory(
    [list('sinPref'), list('borrada'), list('l1')],
    prefs({ borrada: 'ya-no-existe', l1: 'despensa' }),
    [category('despensa', 0)],
  )
  expect(groups.map((g) => [g.category?.id ?? null, g.lists.map((l) => l.id)])).toEqual([
    ['despensa', ['l1']],
    [null, ['sinPref', 'borrada']],
  ])
})

test('categories with no lists are left out', () => {
  const groups = groupListsByCategory([list('l1')], prefs({ l1: 'despensa' }), [
    category('despensa', 0),
    category('jardin', 1),
  ])
  expect(groups.map((g) => g.category?.id)).toEqual(['despensa'])
})

test('no lists means no groups', () => {
  expect(groupListsByCategory([], {}, [category('despensa', 0)])).toEqual([])
})
