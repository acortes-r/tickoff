import { act, renderHook } from '@testing-library/react'
import { onSnapshot, type Query } from 'firebase/firestore'
import { useQueryData } from './useQueryData'

vi.mock('firebase/firestore', () => ({ onSnapshot: vi.fn() }))

type Next = (snap: { docs: { data: () => string }[] }) => void
type Fail = (e: Error) => void

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(onSnapshot).mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => vi.useRealTimers())

const denied = () => Object.assign(new Error('denied'), { code: 'permission-denied' })

test('a listener error ends loading with no data once retries run out', () => {
  vi.mocked(onSnapshot).mockImplementation(((_q: unknown, _next: Next, error: Fail) => {
    error(denied())
    return () => {}
  }) as never)
  const { result } = renderHook(() => useQueryData('k', () => ({}) as Query<string>))
  act(() => vi.runAllTimers())
  expect(result.current).toEqual([])
})

test('retries after an early error (a list the server has not seen yet) and recovers', () => {
  let call = 0
  vi.mocked(onSnapshot).mockImplementation(((_q: unknown, next: Next, error: Fail) => {
    call += 1
    if (call === 1) error(denied())
    else next({ docs: [{ data: () => 'Leche' }] })
    return () => {}
  }) as never)
  const { result } = renderHook(() => useQueryData('k', () => ({}) as Query<string>))
  expect(result.current).toBeNull()
  act(() => vi.advanceTimersByTime(2000))
  expect(result.current).toEqual(['Leche'])
})
