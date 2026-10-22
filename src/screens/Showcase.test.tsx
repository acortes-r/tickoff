import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Showcase from './Showcase'

test('renders each section', () => {
  render(<Showcase />)
  for (const name of ['Botones', 'Formulario', 'Alertas', 'Modales']) {
    expect(screen.getByRole('heading', { name })).toBeInTheDocument()
  }
})

test('first Tab focuses the first button', async () => {
  const user = userEvent.setup()
  render(<Showcase />)
  await user.tab()
  expect(screen.getAllByRole('button')[0]).toHaveFocus()
})

test('Escape closes the delete-list confirmation', async () => {
  const user = userEvent.setup()
  render(<Showcase />)
  await user.click(screen.getByRole('button', { name: 'Borrar lista' }))
  expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
})
