import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { Toaster } from '@/components/ui/sonner'

// Solo en desarrollo: en el build de producción la rama se elimina con el chunk.
const Showcase = import.meta.env.DEV ? lazy(() => import('./screens/Showcase')) : null

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<h1>tickoff</h1>} />
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
