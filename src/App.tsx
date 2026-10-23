import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { Toaster } from '@/components/ui/sonner'
import { useAuth } from '@/hooks/useAuth'
import Login from '@/screens/Login'

// Solo en desarrollo: en el build de producción la rama se elimina con el chunk.
const Showcase = import.meta.env.DEV ? lazy(() => import('./screens/Showcase')) : null

function SignedIn() {
  return <h1 className="mx-auto max-w-[480px] px-4 py-8 text-2xl font-semibold">tickoff</h1>
}

function App() {
  const { user, loading } = useAuth()
  const home = loading ? null : user ? <SignedIn /> : <Login />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="*" element={home} />
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
      </Routes>
      <Toaster visibleToasts={2} />
    </BrowserRouter>
  )
}

export default App
