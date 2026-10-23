import { render, screen } from '@testing-library/react'
import type { User } from 'firebase/auth'
import { Timestamp } from 'firebase/firestore'
import { MemoryRouter, Route, Routes } from 'react-router'
import type { ListDoc, UserDoc } from '@/data/types'
import { useCategories } from '@/hooks/useCategories'
import { useListPrefs } from '@/hooks/useListPrefs'
import { useLists } from '@/hooks/useLists'
import { useUserDoc } from '@/hooks/useUserDoc'
import Home from './Home'

vi.mock('@/firebase', () => ({ auth: {}, db: {} }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { uid: 'alice' } as User, loading: false }) }))
vi.mock('@/hooks/useUserDoc', () => ({ useUserDoc: vi.fn() }))
vi.mock('@/hooks/useLists', () => ({ useLists: vi.fn() }))
vi.mock('@/hooks/useListPrefs', () => ({ useListPrefs: vi.fn() }))
vi.mock('@/hooks/useCategories', () => ({ useCategories: vi.fn() }))
vi.mock('@/hooks/usePendingCounts', () => ({ usePendingCounts: () => ({ buy: 2, do: 1 }) }))

const at = Timestamp.fromMillis(0)
const despensa: ListDoc = {
  id: 'l1',
  name: 'Despensa',
  ownerId: 'alice',
  memberIds: ['alice'],
  members: {},
  createdAt: at,
}
const userDoc = (lastListId: string | null): UserDoc => ({
  id: 'alice',
  displayName: 'Ana Prueba',
  photoURL: null,
  defaultStoreId: 's1',
  lastListId,
  createdAt: at,
})

function renderHome() {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/l/:listId" element={<p>Lista abierta</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  sessionStorage.clear()
  vi.mocked(useLists).mockReturnValue([despensa])
  vi.mocked(useListPrefs).mockReturnValue({})
  vi.mocked(useCategories).mockReturnValue([])
})

test('cold start opens the last list used', async () => {
  vi.mocked(useUserDoc).mockReturnValue(userDoc('l1'))
  renderHome()
  expect(await screen.findByText('Lista abierta')).toBeInTheDocument()
})

test('cold start stays on Home when the last list is no longer accessible', () => {
  vi.mocked(useUserDoc).mockReturnValue(userDoc('borrada'))
  renderHome()
  expect(screen.getByRole('heading', { name: 'tickoff' })).toBeInTheDocument()
  expect(screen.queryByText('Lista abierta')).not.toBeInTheDocument()
})

test('coming back to Home in the same session does not redirect again', () => {
  sessionStorage.setItem('tickoff.startedAt', '1')
  vi.mocked(useUserDoc).mockReturnValue(userDoc('l1'))
  renderHome()
  expect(screen.queryByText('Lista abierta')).not.toBeInTheDocument()
})

test('shows lists with their pending counts and a shared marker', () => {
  vi.mocked(useUserDoc).mockReturnValue(userDoc(null))
  vi.mocked(useLists).mockReturnValue([despensa, { ...despensa, id: 'l2', name: 'Casa', memberIds: ['alice', 'bob'] }])
  renderHome()
  expect(screen.getByRole('link', { name: /Despensa/ })).toHaveAttribute('href', '/l/l1')
  expect(screen.getAllByText('2 por comprar')).toHaveLength(2)
  expect(screen.getByLabelText('Compartida')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Sin categoría' })).toBeInTheDocument()
})
