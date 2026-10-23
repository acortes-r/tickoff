import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from 'react-router'
import { Toaster } from '@/components/ui/sonner'
import { useAuth } from '@/hooks/useAuth'
import CategoriesScreen from '@/screens/CategoriesScreen'
import Home from '@/screens/Home'
import Login from '@/screens/Login'
import Placeholder from '@/screens/Placeholder'
import Settings from '@/screens/Settings'
import StoresScreen from '@/screens/StoresScreen'

// Solo en desarrollo: en el build de producción la rama se elimina con el chunk.
const Showcase = import.meta.env.DEV ? lazy(() => import('./screens/Showcase')) : null

// Link de invitación abierto sin sesión: se retoma después del login.
const PENDING_JOIN_KEY = 'tickoff.pendingJoin'

function SignedOut() {
  const { pathname } = useLocation()
  useEffect(() => {
    if (pathname.startsWith('/join/')) sessionStorage.setItem(PENDING_JOIN_KEY, pathname)
  }, [pathname])
  return <Login />
}

function SignedIn() {
  const navigate = useNavigate()
  useEffect(() => {
    const pending = sessionStorage.getItem(PENDING_JOIN_KEY)
    if (!pending) return
    sessionStorage.removeItem(PENDING_JOIN_KEY)
    navigate(pending, { replace: true })
  }, [navigate])

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/l/:listId" element={<Placeholder title="Lista" />} />
      <Route path="/l/:listId/history" element={<Placeholder title="Historial" />} />
      <Route path="/l/:listId/share" element={<Placeholder title="Compartir" />} />
      <Route path="/join/:listId/:token" element={<Placeholder title="Unirse a una lista" />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/settings/categories" element={<CategoriesScreen />} />
      <Route path="/settings/stores" element={<StoresScreen />} />
      <Route path="*" element={<Home />} />
    </Routes>
  )
}

function AppRoutes() {
  const { user, loading } = useAuth()
  const app = loading ? null : user ? <SignedIn /> : <SignedOut />

  return (
    <Routes>
      {Showcase && (
        <Route
          path="/showcase"
          element={
            <Suspense>
              <Showcase />
            </Suspense>
          }
        />
      )}
      <Route path="*" element={app} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <Toaster visibleToasts={2} />
    </BrowserRouter>
  )
}

export default App
