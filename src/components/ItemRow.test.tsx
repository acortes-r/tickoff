import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Timestamp } from 'firebase/firestore'
import type { ItemDoc } from '@/data/types'
import { ItemRow } from './ItemRow'

const base: ItemDoc = {
  id: 'i1',
  kind: 'buy',
  name: 'Jamón',
  normalizedName: 'jamon',
  quantity: '1/2 kg',
  storeName: 'Mercado',
  status: 'pending',
  addedBy: 'alice',
  addedByName: 'Ana Prueba',
  createdAt: Timestamp.fromMillis(0),
  updatedAt: Timestamp.fromMillis(0),
}

test('tapping the row toggles it', async () => {
  const onToggle = vi.fn()
  render(<ItemRow item={base} onToggle={onToggle} onEdit={vi.fn()} />)
  await userEvent.setup().click(screen.getByRole('checkbox', { name: 'Jamón' }))
  expect(onToggle).toHaveBeenCalledOnce()
})

test('shows quantity, store and who added it', () => {
  render(<ItemRow item={base} onToggle={vi.fn()} onEdit={vi.fn()} />)
  expect(screen.getByText('1/2 kg · Mercado')).toBeInTheDocument()
  expect(screen.getByRole('img', { name: 'Agregó Ana Prueba' })).toBeInTheDocument()
})

test('a done item is checked and shows who completed it', () => {
  render(
    <ItemRow item={{ ...base, status: 'done', doneBy: 'bob', doneByName: 'Beto Prueba' }} onToggle={vi.fn()} onEdit={vi.fn()} />,
  )
  expect(screen.getByRole('checkbox', { name: 'Jamón' })).toBeChecked()
  expect(screen.getByRole('img', { name: 'Completó Beto Prueba' })).toBeInTheDocument()
})

test('the edit button opens the editor', async () => {
  const onEdit = vi.fn()
  render(<ItemRow item={base} onToggle={vi.fn()} onEdit={onEdit} />)
  await userEvent.setup().click(screen.getByRole('button', { name: 'Editar Jamón' }))
  expect(onEdit).toHaveBeenCalledOnce()
})
