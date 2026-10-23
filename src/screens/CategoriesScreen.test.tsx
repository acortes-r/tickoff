import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { User } from 'firebase/auth'
import { MemoryRouter } from 'react-router'
import { createCategory, deleteCategory, reorderCategories } from '@/data/categories'
import CategoriesScreen from './CategoriesScreen'

vi.mock('@/firebase', () => ({ auth: {}, db: {} }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { uid: 'alice' } as User, loading: false }) }))
vi.mock('@/hooks/useCategories', () => ({
  useCategories: () => [
    { id: 'c1', name: 'Despensa', icon: 'shopping-basket', color: 'tone-2', order: 0 },
    { id: 'c2', name: 'Trabajo', icon: 'briefcase', color: 'tone-6', order: 1 },
    { id: 'c3', name: 'Jardín', icon: 'sprout', color: 'tone-4', order: 2 },
  ],
}))
vi.mock('@/data/categories', () => ({
  createCategory: vi.fn().mockResolvedValue('c4'),
  updateCategory: vi.fn().mockResolvedValue(undefined),
  deleteCategory: vi.fn().mockResolvedValue(undefined),
  reorderCategories: vi.fn().mockResolvedValue(undefined),
}))

function renderScreen() {
  render(
    <MemoryRouter>
      <CategoriesScreen />
    </MemoryRouter>,
  )
}

beforeEach(() => vi.clearAllMocks())

test('moving a category down swaps it with the next one', async () => {
  const user = userEvent.setup()
  renderScreen()
  await user.click(screen.getByRole('button', { name: 'Bajar Despensa' }))
  expect(reorderCategories).toHaveBeenCalledWith({}, 'alice', ['c2', 'c1', 'c3'])
})

test('the first cannot move up and the last cannot move down', () => {
  renderScreen()
  expect(screen.getByRole('button', { name: 'Subir Despensa' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Bajar Jardín' })).toBeDisabled()
})

test('deleting explains where its lists go and waits for confirmation', async () => {
  const user = userEvent.setup()
  renderScreen()
  await user.click(screen.getByRole('button', { name: 'Borrar Trabajo' }))
  const dialog = screen.getByRole('alertdialog')
  expect(within(dialog).getByText(/Sin categoría/)).toBeInTheDocument()
  expect(deleteCategory).not.toHaveBeenCalled()
  await user.click(within(dialog).getByRole('button', { name: 'Borrar' }))
  expect(deleteCategory).toHaveBeenCalledWith({}, 'alice', 'c2')
})

test('creates a category with name, icon and tone', async () => {
  const user = userEvent.setup()
  renderScreen()
  await user.click(screen.getByRole('button', { name: 'Nueva categoría' }))
  await user.type(screen.getByLabelText('Nombre'), 'Casa')
  await user.click(screen.getByRole('radio', { name: 'Casa' }))
  await user.click(screen.getByRole('radio', { name: 'Tono 3' }))
  await user.click(screen.getByRole('button', { name: 'Guardar' }))
  expect(createCategory).toHaveBeenCalledWith({}, 'alice', { name: 'Casa', icon: 'house', color: 'tone-3' })
})
