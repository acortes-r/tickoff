import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Timestamp } from 'firebase/firestore'
import type { ItemDoc, ProductDoc } from '@/data/types'
import { CaptureBar } from './CaptureBar'

const leche: ItemDoc = {
  id: 'i1',
  kind: 'buy',
  name: 'Leche',
  normalizedName: 'leche',
  status: 'pending',
  addedBy: 'alice',
  addedByName: 'Ana Prueba',
  createdAt: Timestamp.fromMillis(0),
  updatedAt: Timestamp.fromMillis(0),
}
const jamon: ProductDoc = { id: 'jamon', name: 'Jamón', lastStoreName: 'Mercado', timesPurchased: 2 }

function setup(kind: 'buy' | 'do' = 'buy') {
  const onAdd = vi.fn()
  const onDuplicate = vi.fn()
  render(
    <CaptureBar
      kind={kind}
      items={[leche]}
      products={[jamon]}
      storeOptions={['Mercado', 'Super']}
      defaultStoreName="Super"
      onAdd={onAdd}
      onDuplicate={onDuplicate}
    />,
  )
  return { onAdd, onDuplicate, user: userEvent.setup(), input: screen.getByRole('textbox', { name: 'Agregar' }) }
}

test('Enter adds the item, clears the field and keeps focus', async () => {
  const { onAdd, user, input } = setup()
  await user.type(input, 'Pan{Enter}')
  expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ kind: 'buy', name: 'Pan', storeName: 'Super' }))
  expect(input).toHaveValue('')
  expect(input).toHaveFocus()
})

test('a pending duplicate is not added and is pointed out', async () => {
  const { onAdd, onDuplicate, user, input } = setup()
  await user.type(input, 'LECHE {Enter}')
  expect(onAdd).not.toHaveBeenCalled()
  expect(onDuplicate).toHaveBeenCalledWith(leche)
  expect(screen.getByText('Ya está en la lista')).toBeInTheDocument()
})

test('on the Hacer tab the item is a task', async () => {
  const { onAdd, user, input } = setup('do')
  await user.type(input, 'Leche{Enter}')
  expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ kind: 'do', name: 'Leche' }))
})

test('blank input adds nothing', async () => {
  const { onAdd, user, input } = setup()
  await user.type(input, '   {Enter}')
  expect(onAdd).not.toHaveBeenCalled()
})

test('suggests known products without accents and uses their last store', async () => {
  const { onAdd, user, input } = setup()
  await user.type(input, 'jam')
  await user.click(screen.getByRole('button', { name: 'Jamón' }))
  expect(input).toHaveValue('Jamón')
  expect(input).toHaveFocus()
  await user.keyboard('{Enter}')
  expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ name: 'Jamón', storeName: 'Mercado' }))
})

test('sends the quantity when given', async () => {
  const { onAdd, user, input } = setup()
  await user.type(screen.getByRole('textbox', { name: 'Cantidad' }), '2 kg')
  await user.type(input, 'Tortillas{Enter}')
  expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ name: 'Tortillas', quantity: '2 kg' }))
  expect(screen.getByRole('textbox', { name: 'Cantidad' })).toHaveValue('')
})
