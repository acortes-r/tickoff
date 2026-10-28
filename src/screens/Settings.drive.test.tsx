import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { toast } from 'sonner'
import { ensureFolder, getDriveToken, uploadFile } from '@/data/drive'
import { collectExport } from '@/data/export'
import { setDriveFolderId } from '@/data/users'
import { downloadFiles } from '@/lib/download'

vi.mock('@/firebase', () => ({ auth: {}, db: {} }))
vi.mock('@/auth', () => ({ signOutUser: vi.fn() }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { uid: 'alice' }, loading: false }) }))
vi.mock('@/hooks/useUserDoc', () => ({ useUserDoc: () => ({ id: 'alice', driveFolderId: 'old' }) }))
vi.mock('@/data/users', () => ({ setDriveFolderId: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/download', () => ({ downloadFiles: vi.fn().mockResolvedValue(undefined) }))
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { error: vi.fn() }) }))
vi.mock('@/data/export', () => ({
  collectExport: vi.fn().mockResolvedValue({ exportedAt: '', categories: [], stores: [], lists: [] }),
  itemsCsv: () => 'items',
  historyCsv: () => 'history',
}))
vi.mock('@/data/drive', () => ({
  loadGis: vi.fn().mockResolvedValue(undefined),
  getDriveToken: vi.fn(),
  ensureFolder: vi.fn(),
  listNames: vi.fn().mockResolvedValue([]),
  uniqueName: (_: string[], base: string, ext: string) => `${base}.${ext}`,
  uploadFile: vi.fn(),
  folderUrl: (id: string) => `https://drive.example/${id}`,
}))

async function renderScreen() {
  vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'client-id-de-prueba')
  vi.resetModules()
  const { default: Settings } = await import('./Settings')
  render(
    <MemoryRouter>
      <Settings />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => vi.unstubAllEnvs())

test('asks for the Drive token before gathering data, uploads both CSVs and remembers the folder', async () => {
  const order: string[] = []
  vi.mocked(getDriveToken).mockImplementation(async () => (order.push('token'), 'tok'))
  vi.mocked(collectExport).mockImplementation(async () => {
    order.push('collect')
    return { exportedAt: '', categories: [], stores: [], lists: [] }
  })
  vi.mocked(ensureFolder).mockResolvedValue('new')
  vi.mocked(uploadFile).mockResolvedValue({ id: 'x', webViewLink: '' })
  await renderScreen()
  await userEvent.click(screen.getByRole('button', { name: 'Exportar CSV' }))

  expect(order).toEqual(['token', 'collect'])
  expect(getDriveToken).toHaveBeenCalledWith('client-id-de-prueba')
  expect(ensureFolder).toHaveBeenCalledWith('tok', 'old')
  expect(vi.mocked(uploadFile).mock.calls.map((c) => c[2])).toEqual([
    expect.stringMatching(/^tickoff-elementos-\d{4}-\d{2}-\d{2}\.csv$/),
    expect.stringMatching(/^tickoff-historial-\d{4}-\d{2}-\d{2}\.csv$/),
  ])
  expect(setDriveFolderId).toHaveBeenCalledWith({}, 'alice', 'new')
  expect(toast).toHaveBeenCalledWith('Guardado en Drive › tickoff', expect.anything())
})

test('when Drive fails, offers to download the backup to the phone', async () => {
  vi.mocked(getDriveToken).mockResolvedValue('tok')
  vi.mocked(ensureFolder).mockRejectedValue(new Error('drive-500'))
  await renderScreen()
  await userEvent.click(screen.getByRole('button', { name: 'Exportar JSON' }))

  expect(await screen.findByText('No se pudo guardar en Drive')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Descargar al celular' }))
  expect(downloadFiles).toHaveBeenCalledWith([
    expect.objectContaining({ name: expect.stringMatching(/^tickoff-\d{4}-\d{2}-\d{2}\.json$/), mime: 'application/json' }),
  ])
})
