import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { User } from 'firebase/auth'
import { Timestamp } from 'firebase/firestore'
import { MemoryRouter, Route, Routes } from 'react-router'
import { createInvite } from '@/data/sharing'
import ShareScreen from './ShareScreen'

vi.mock('@/firebase', () => ({ auth: {}, db: {} }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { uid: 'alice', displayName: 'Ana Prueba' } as User, loading: false }) }))
vi.mock('@/hooks/useUserDoc', () => ({ useUserDoc: () => null }))
vi.mock('@/hooks/useInvites', () => ({ useInvites: () => [] }))
vi.mock('@/hooks/useList', () => ({
  useList: () => ({
    id: 'l1',
    name: 'Despensa',
    ownerId: 'alice',
    memberIds: ['alice'],
    members: { alice: { displayName: 'Ana Prueba', photoURL: null } },
    createdAt: Timestamp.fromMillis(0),
  }),
}))
vi.mock('@/data/sharing', () => ({
  createInvite: vi.fn(),
  leaveList: vi.fn(),
  removeMember: vi.fn(),
  revokeInvite: vi.fn(),
}))

test('opens the share sheet in the same tap, without waiting for the server (iOS keeps the gesture)', async () => {
  const share = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'share', { value: share, configurable: true })
  // Una escritura que nunca confirma (señal débil): si la pantalla la espera, no comparte.
  const pending = new Promise<never>(() => {})
  vi.mocked(createInvite).mockReturnValue(
    Object.assign(pending, { token: 't'.repeat(32), url: 'http://localhost/join/l1/tttt', written: pending }) as never,
  )
  render(
    <MemoryRouter initialEntries={['/l/l1/share']}>
      <Routes>
        <Route path="/l/:listId/share" element={<ShareScreen />} />
      </Routes>
    </MemoryRouter>,
  )
  await userEvent.setup().click(screen.getByRole('button', { name: 'Compartir' }))
  expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: 'http://localhost/join/l1/tttt' }))
})
