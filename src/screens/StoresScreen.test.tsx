import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { User } from 'firebase/auth'
import { Timestamp } from 'firebase/firestore'
import { MemoryRouter } from 'react-router'
import { createStore, deleteStore, setDefaultStore } from '@/data/stores'
import StoresScreen from './StoresScreen'

vi.mock('@/firebase', () => ({ auth: {}, db: {} }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { uid: 'alice' } as User, loading: false }) }))
vi.mock('@/hooks/useStores', () => ({
  useStores: () => ({
    defaultStoreId: 's1',
    stores: [
      { id: 's1', name: 'Super', createdAt: Timestamp.fromMillis(0) },
      { id: 's2', name: 'Mercado', createdAt: Timestamp.fromMillis(0) },
    ],
  }),
}))
vi.mock('@/data/stores', () => ({
  createStore: vi.fn().mockResolvedValue('s3'),
  renameStore: vi.fn().mockResolvedValue(undefined),
  deleteStore: vi.fn().mockResolvedValue(undefined),
  setDefaultStore: vi.fn().mockResolvedValue(undefined),
}))

function renderScreen() {
  render(
    <MemoryRouter>
      <StoresScreen />
    </MemoryRouter>,
  )
}

beforeEach(() => vi.clearAllMocks())

test('the default store is marked and cannot be deleted', () => {
  renderScreen()
  expect(screen.getByText('Default')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Borrar Super' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Borrar Mercado' })).toBeInTheDocument()
})

test('makes another store the default', async () => {
  const user = userEvent.setup()
  renderScreen()
  await user.click(screen.getByRole('button', { name: 'Hacer default Mercado' }))
  expect(setDefaultStore).toHaveBeenCalledWith({}, 'alice', 's2')
})

test('deleting asks for confirmation first', async () => {
  const user = userEvent.setup()
  renderScreen()
  await user.click(screen.getByRole('button', { name: 'Borrar Mercado' }))
  expect(deleteStore).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Borrar' }))
  expect(deleteStore).toHaveBeenCalledWith({}, 'alice', 's2')
})

test('adds a store with a clean name', async () => {
  const user = userEvent.setup()
  renderScreen()
  await user.click(screen.getByRole('button', { name: 'Nueva tienda' }))
  await user.type(screen.getByLabelText('Nombre'), '  Tienda   de la esquina ')
  await user.click(screen.getByRole('button', { name: 'Guardar' }))
  expect(createStore).toHaveBeenCalledWith({}, 'alice', 'Tienda de la esquina')
})
