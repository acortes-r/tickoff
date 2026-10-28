import { render, screen } from '@testing-library/react'
import type { User } from 'firebase/auth'
import App from './App'
import { useAuth } from '@/hooks/useAuth'

vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn() }))
vi.mock('@/auth', () => ({ signIn: vi.fn(), signOutUser: vi.fn() }))
vi.mock('@/firebase', () => ({ auth: {}, db: {} }))
vi.mock('@/screens/Home', () => ({ default: () => <h1>Inicio</h1> }))
vi.mock('@/screens/JoinScreen', () => ({ default: () => <h1>Unirse a una lista</h1> }))
vi.mock('@/hooks/useLists', () => ({ useLists: () => [] }))
vi.mock('@/hooks/useUserDoc', () => ({ useUserDoc: () => null }))
vi.mock('@/components/ActivityBanner', () => ({ ActivityBanner: () => null }))

const signedIn = { user: { uid: 'alice' } as User, loading: false }

beforeEach(() => {
  sessionStorage.clear()
  window.history.pushState({}, '', '/')
})

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

test('shows Home when signed in', () => {
  vi.mocked(useAuth).mockReturnValue(signedIn)
  render(<App />)
  expect(screen.getByRole('heading', { name: 'Inicio' })).toBeInTheDocument()
})

test('an invite link opened while signed out is remembered', () => {
  vi.mocked(useAuth).mockReturnValue({ user: null, loading: false })
  window.history.pushState({}, '', '/join/l1/token123')
  render(<App />)
  expect(screen.getByRole('button', { name: 'Entrar con Google' })).toBeInTheDocument()
  expect(sessionStorage.getItem('tickoff.pendingJoin')).toBe('/join/l1/token123')
})

test('after login the remembered invite link opens', async () => {
  sessionStorage.setItem('tickoff.pendingJoin', '/join/l1/token123')
  vi.mocked(useAuth).mockReturnValue(signedIn)
  render(<App />)
  expect(await screen.findByRole('heading', { name: 'Unirse a una lista' })).toBeInTheDocument()
  expect(window.location.pathname).toBe('/join/l1/token123')
  expect(sessionStorage.getItem('tickoff.pendingJoin')).toBeNull()
})

test('a cold start on another screen keeps Home from jumping to the last list later', () => {
  vi.mocked(useAuth).mockReturnValue(signedIn)
  window.history.pushState({}, '', '/settings')
  render(<App />)
  expect(sessionStorage.getItem('tickoff.startedAt')).not.toBeNull()
})

test('a cold start on Home leaves the jump to Home', () => {
  vi.mocked(useAuth).mockReturnValue(signedIn)
  render(<App />)
  expect(sessionStorage.getItem('tickoff.startedAt')).toBeNull()
})
