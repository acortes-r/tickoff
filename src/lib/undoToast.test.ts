import { toast } from 'sonner'
import { showUndoToast } from './undoToast'

vi.mock('sonner', () => ({ toast: vi.fn() }))

test('shows the message for 10 s with a Deshacer action that runs once', () => {
  const onUndo = vi.fn()
  showUndoToast('Compra cerrada', onUndo)
  expect(toast).toHaveBeenCalledWith(
    'Compra cerrada',
    expect.objectContaining({ duration: 10_000, action: expect.objectContaining({ label: 'Deshacer' }) }),
  )
  const options = vi.mocked(toast).mock.calls[0][1] as unknown as { action: { onClick: () => void } }
  options.action.onClick()
  expect(onUndo).toHaveBeenCalledOnce()
})
