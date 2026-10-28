import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation, useNavigate, useParams } from 'react-router'
import { ActivityBanner } from '@/components/ActivityBanner'
import { SyncBadge } from '@/components/SyncBadge'
import { Toaster } from '@/components/ui/sonner'
import { ActivityProvider } from '@/hooks/useActivity'
import { useAuth } from '@/hooks/useAuth'
import { useLists } from '@/hooks/useLists'
import { markStarted, PENDING_JOIN_KEY, STARTED_KEY } from '@/lib/session'
import CategoriesScreen from '@/screens/CategoriesScreen'
import HistoryScreen from '@/screens/HistoryScreen'
import Home from '@/screens/Home'
import JoinScreen from '@/screens/JoinScreen'
import ListScreen from '@/screens/ListScreen'
import Login from '@/screens/Login'
import Settings from '@/screens/Settings'
import ShareScreen from '@/screens/ShareScreen'
import StoresScreen from '@/screens/StoresScreen'

// Solo en desarrollo: en el build de producción la rama se elimina con el chunk.
const Showcase = import.meta.env.DEV ? lazy(() => import('./screens/Showcase')) : null


/** Otra lista = pantalla nueva (pestaña, filtro y resaltados no pasan de una lista a otra). */
function KeyedListScreen() {
  const { listId } = useParams()
  return <ListScreen key={listId} />
}

function SignedOut() {
  const { pathname } = useLocation()
  useEffect(() => {
    if (pathname.startsWith('/join/')) sessionStorage.setItem(PENDING_JOIN_KEY, pathname)
  }, [pathname])
  return <Login />
}

function SignedIn() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  // Solo un arranque en Inicio salta a la última lista; si la app abrió en
  // otra pantalla, volver a Inicio debe quedarse en Inicio.
  useEffect(() => {
    const pending = sessionStorage.getItem(PENDING_JOIN_KEY)
    if (!sessionStorage.getItem(STARTED_KEY) && (pending || pathname !== '/')) markStarted()
    if (!pending) return
    sessionStorage.removeItem(PENDING_JOIN_KEY)
    navigate(pending, { replace: true })
    // Solo al montar: es la decisión de arranque.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { user } = useAuth()
  const lists = useLists(user!.uid)

  return (
    <ActivityProvider lists={lists}>
      <ActivityBanner />
      <SyncBadge />
      <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/l/:listId" element={<KeyedListScreen />} />
      <Route path="/l/:listId/history" element={<HistoryScreen />} />
      <Route path="/l/:listId/share" element={<ShareScreen />} />
      <Route path="/join/:listId/:token" element={<JoinScreen />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/settings/categories" element={<CategoriesScreen />} />
      <Route path="/settings/stores" element={<StoresScreen />} />
      <Route path="*" element={<Home />} />
      </Routes>
    </ActivityProvider>
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
