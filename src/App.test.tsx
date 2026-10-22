import { render, screen } from '@testing-library/react'
import App from './App'

test('renders app name', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: 'tickoff' })).toBeInTheDocument()
})
