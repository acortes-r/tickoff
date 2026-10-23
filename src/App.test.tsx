import { render, screen } from '@testing-library/react'
import type { User } from 'firebase/auth'
import App from './App'
import { useAuth } from '@/hooks/useAuth'

vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn() }))
vi.mock('@/auth', () => ({ signIn: vi.fn(), signOutUser: vi.fn() }))
vi.mock('@/firebase', () => ({ auth: {}, db: {} }))

test('shows the login screen when signed out', () => {
  vi.mocked(useAuth).mockReturnValue({ user: null, loading: false })
  render(<App />)
  expect(screen.getByRole('heading', { name: 'tickoff' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Entrar con Google' })).toBeInTheDocument()
})

test('does not show the login screen while auth is loading', () => {
  vi.mocked(useAuth).mockReturnValue({ user: null, loading: true })
  render(<App />)
  expect(screen.queryByRole('button', { name: 'Entrar con Google' })).not.toBeInTheDocument()
})

test('shows the app when signed in', () => {
  vi.mocked(useAuth).mockReturnValue({ user: { uid: 'alice' } as User, loading: false })
  render(<App />)
  expect(screen.queryByRole('button', { name: 'Entrar con Google' })).not.toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'tickoff' })).toBeInTheDocument()
})
