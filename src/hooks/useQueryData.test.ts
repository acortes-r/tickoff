import { renderHook } from '@testing-library/react'
import { onSnapshot, type Query } from 'firebase/firestore'
import { useQueryData } from './useQueryData'

vi.mock('firebase/firestore', () => ({ onSnapshot: vi.fn() }))

test('a listener error ends loading with no data instead of hanging', () => {
  vi.mocked(onSnapshot).mockImplementation(((_q: unknown, _next: unknown, error: (e: Error) => void) => {
    error(Object.assign(new Error('denied'), { code: 'permission-denied' }))
    return () => {}
  }) as never)
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const { result } = renderHook(() => useQueryData('k', () => ({}) as Query<string>))
  expect(result.current).toEqual([])
})
