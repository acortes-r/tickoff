import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { createList } from '@/data/lists'
import { NewListDialog } from './NewListDialog'

vi.mock('@/firebase', () => ({ auth: {}, db: {} }))
vi.mock('@/data/lists', () => ({ createList: vi.fn() }))

function renderDialog() {
  render(
    <MemoryRouter>
      <Routes>
        <Route
          path="/"
          element={
            <NewListDialog
              uid="alice"
              member={{ displayName: 'Ana Prueba', photoURL: null }}
              categories={[{ id: 'c1', name: 'Despensa', icon: 'tag', color: 'tone-1', order: 0 }]}
            />
          }
        />
        <Route path="/l/nueva" element={<p>Lista nueva abierta</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

test('opens the new list right away, even before the server confirms it (offline)', async () => {
  vi.mocked(createList).mockReturnValue({ id: 'nueva', written: new Promise(() => {}) })
  const user = userEvent.setup()
  renderDialog()
  await user.click(screen.getByRole('button', { name: 'Nueva lista' }))
  await user.type(screen.getByLabelText('Nombre'), 'Jardín')
  await user.click(screen.getByRole('button', { name: 'Crear lista' }))
  expect(createList).toHaveBeenCalledWith({}, 'alice', { displayName: 'Ana Prueba', photoURL: null }, 'Jardín', 'c1')
  expect(await screen.findByText('Lista nueva abierta')).toBeInTheDocument()
})
