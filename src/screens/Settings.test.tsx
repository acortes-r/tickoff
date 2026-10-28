import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { signOutUser } from '@/auth'
import Settings from './Settings'

vi.mock('@/firebase', () => ({ auth: {}, db: {} }))
vi.mock('@/auth', () => ({ signOutUser: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { uid: 'alice' }, loading: false }) }))
vi.mock('@/hooks/useUserDoc', () => ({ useUserDoc: () => null }))

function renderScreen() {
  render(
    <MemoryRouter>
      <Settings />
    </MemoryRouter>,
  )
}

test('links to categories and stores', () => {
  renderScreen()
  expect(screen.getByRole('link', { name: /Categorías/ })).toHaveAttribute('href', '/settings/categories')
  expect(screen.getByRole('link', { name: /Tiendas/ })).toHaveAttribute('href', '/settings/stores')
})

test('shows the app version', () => {
  renderScreen()
  expect(screen.getByText(`Versión ${__APP_VERSION__}`)).toBeInTheDocument()
})

test('signs out', async () => {
  const user = userEvent.setup()
  renderScreen()
  await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
  expect(signOutUser).toHaveBeenCalledOnce()
})
