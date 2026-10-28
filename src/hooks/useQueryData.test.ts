import { act, renderHook } from '@testing-library/react'
import { onSnapshot, type Query } from 'firebase/firestore'
import { useQueryData } from './useQueryData'
import { useSyncState } from './useSyncState'

vi.mock('firebase/firestore', () => ({ onSnapshot: vi.fn() }))

type Snap = { docs: { data: () => string }[]; metadata?: { hasPendingWrites: boolean } }
type Next = (snap: Snap) => void
type Fail = (e: Error) => void

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(onSnapshot).mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => vi.useRealTimers())

const denied = () => Object.assign(new Error('denied'), { code: 'permission-denied' })

test('a listener error ends loading with no data once retries run out', () => {
  vi.mocked(onSnapshot).mockImplementation(((_q: unknown, _opts: unknown, _next: Next, error: Fail) => {
    error(denied())
    return () => {}
  }) as never)
  const { result } = renderHook(() => useQueryData('k', () => ({}) as Query<string>))
  act(() => vi.runAllTimers())
  expect(result.current).toEqual([])
})

test('retries after an early error (a list the server has not seen yet) and recovers', () => {
  let call = 0
  vi.mocked(onSnapshot).mockImplementation(((_q: unknown, _opts: unknown, next: Next, error: Fail) => {
    call += 1
    if (call === 1) error(denied())
    else next({ docs: [{ data: () => 'Leche' }], metadata: { hasPendingWrites: false } })
    return () => {}
  }) as never)
  const { result } = renderHook(() => useQueryData('k', () => ({}) as Query<string>))
  expect(result.current).toBeNull()
  act(() => vi.advanceTimersByTime(2000))
  expect(result.current).toEqual(['Leche'])
})

test('reports pending writes until the server confirms them or the listener closes', () => {
  let push: Next = () => {}
  vi.mocked(onSnapshot).mockImplementation(((_q: unknown, _opts: unknown, next: Next) => {
    push = next
    return () => {}
  }) as never)
  const sync = renderHook(() => useSyncState())
  const { unmount } = renderHook(() => useQueryData('k', () => ({}) as Query<string>))
  expect(vi.mocked(onSnapshot).mock.calls[0][1]).toEqual({ includeMetadataChanges: true })
  act(() => push({ docs: [{ data: () => 'Leche' }], metadata: { hasPendingWrites: true } }))
  expect(sync.result.current).toBe('pending')
  act(() => push({ docs: [{ data: () => 'Leche' }], metadata: { hasPendingWrites: false } }))
  expect(sync.result.current).toBe('online')
  act(() => push({ docs: [{ data: () => 'Leche' }], metadata: { hasPendingWrites: true } }))
  unmount()
  expect(sync.result.current).toBe('online')
})
