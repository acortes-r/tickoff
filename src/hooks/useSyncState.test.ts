import { act, renderHook } from '@testing-library/react'
import { toast } from 'sonner'
import { createPendingReporter, reportWriteError, useSyncState } from './useSyncState'

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

function setOnline(online: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => online })
  window.dispatchEvent(new Event(online ? 'online' : 'offline'))
}

afterEach(() => {
  setOnline(true)
  vi.useRealTimers()
  vi.mocked(toast.error).mockClear()
})

describe('useSyncState', () => {
  it('is offline after the offline event', () => {
    const { result } = renderHook(() => useSyncState())
    expect(result.current).toBe('online')
    act(() => setOnline(false))
    expect(result.current).toBe('offline')
  })

  it('is pending while a reporter has pending writes, online when it clears', () => {
    const { result } = renderHook(() => useSyncState())
    const reporter = createPendingReporter()
    act(() => reporter.set(true))
    expect(result.current).toBe('pending')
    act(() => reporter.clear())
    expect(result.current).toBe('online')
  })

  it('stays pending while another reporter still has pending writes', () => {
    const { result } = renderHook(() => useSyncState())
    const a = createPendingReporter()
    const b = createPendingReporter()
    act(() => {
      a.set(true)
      b.set(true)
    })
    act(() => a.set(false))
    expect(result.current).toBe('pending')
    act(() => b.clear())
    expect(result.current).toBe('online')
  })

  it('offline wins over pending', () => {
    const { result } = renderHook(() => useSyncState())
    const reporter = createPendingReporter()
    act(() => {
      reporter.set(true)
      setOnline(false)
    })
    expect(result.current).toBe('offline')
    act(() => reporter.clear())
  })
})

describe('reportWriteError', () => {
  const ACCESS = 'Algunos cambios no se guardaron porque ya no tienes acceso a esta lista'

  it('shows the access message once per 10 s on permission-denied', () => {
    vi.useFakeTimers()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    reportWriteError({ code: 'permission-denied' })
    reportWriteError({ code: 'permission-denied' })
    expect(toast.error).toHaveBeenCalledTimes(1)
    expect(toast.error).toHaveBeenCalledWith(ACCESS)
    vi.advanceTimersByTime(10_001)
    reportWriteError({ code: 'permission-denied' })
    expect(toast.error).toHaveBeenCalledTimes(2)
  })

  it('other errors show the generic message, not the access one', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    reportWriteError({ code: 'invalid-argument' })
    expect(toast.error).toHaveBeenCalledTimes(1)
    expect(toast.error).not.toHaveBeenCalledWith(ACCESS)
  })
})
