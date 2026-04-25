import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '../../../store/auth'

vi.mock('../../queries/silentRefresh', () => ({
  silentRefresh: vi.fn().mockResolvedValue('ok'),
}))

import { silentRefresh } from '../../queries/silentRefresh'
import { useTokenRefresh } from '../useTokenRefresh'

const mockSilentRefresh = vi.mocked(silentRefresh)

describe('useTokenRefresh', () => {
  let queryClient: QueryClient

  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  beforeEach(() => {
    vi.useFakeTimers()
    queryClient = new QueryClient()
    useAuthStore.getState().clearAuth()
    mockSilentRefresh.mockReset()
    mockSilentRefresh.mockResolvedValue('ok')
  })

  afterEach(() => {
    vi.useRealTimers()
    queryClient.clear()
  })

  it('does nothing when there is no tokenExpiresAt', () => {
    renderHook(() => useTokenRefresh(), { wrapper })

    vi.advanceTimersByTime(120_000)
    expect(mockSilentRefresh).not.toHaveBeenCalled()
  })

  it('schedules a refresh 1 minute before token expiry', () => {
    // Token expires in 5 minutes
    const fiveMin = Date.now() + 5 * 60_000
    useAuthStore.setState({ tokenExpiresAt: fiveMin })

    renderHook(() => useTokenRefresh(), { wrapper })

    // Should not have refreshed yet
    expect(mockSilentRefresh).not.toHaveBeenCalled()

    // Advance to 1 minute before expiry (4 min from now)
    vi.advanceTimersByTime(4 * 60_000)
    expect(mockSilentRefresh).toHaveBeenCalledOnce()
  })

  it('refreshes immediately when token expires in less than 1 minute', () => {
    // Token expires in 30 seconds — delay would be negative
    useAuthStore.setState({ tokenExpiresAt: Date.now() + 30_000 })

    renderHook(() => useTokenRefresh(), { wrapper })

    expect(mockSilentRefresh).toHaveBeenCalledOnce()
  })

  it('cleans up the timer on unmount', () => {
    useAuthStore.setState({ tokenExpiresAt: Date.now() + 5 * 60_000 })

    const { unmount } = renderHook(() => useTokenRefresh(), { wrapper })
    unmount()

    vi.advanceTimersByTime(10 * 60_000)
    expect(mockSilentRefresh).not.toHaveBeenCalled()
  })

  it('reschedules when tokenExpiresAt changes', () => {
    useAuthStore.setState({ tokenExpiresAt: Date.now() + 10 * 60_000 })

    const { rerender } = renderHook(() => useTokenRefresh(), { wrapper })

    // Update to a closer expiry
    useAuthStore.setState({ tokenExpiresAt: Date.now() + 2 * 60_000 })
    rerender()

    // Advance 1 minute — the new schedule should fire
    vi.advanceTimersByTime(60_000)
    expect(mockSilentRefresh).toHaveBeenCalledOnce()
  })

  describe('visibilitychange', () => {
    function setVisibility(state: 'visible' | 'hidden') {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => state,
      })
      document.dispatchEvent(new Event('visibilitychange'))
    }

    function loginWithExpiry(secondsFromNow: number) {
      const token = `h.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + secondsFromNow }))}.s`
      useAuthStore.getState().setAuth(token, {
        id: 'u1',
        email: 'a@b.com',
        emailVerified: true,
        role: 'user',
        isDemo: false,
      } as any)
    }

    it('refreshes when tab becomes visible and token is expired', () => {
      loginWithExpiry(-10) // already expired
      renderHook(() => useTokenRefresh(), { wrapper })
      mockSilentRefresh.mockClear() // ignore the immediate-on-mount refresh

      setVisibility('hidden')
      setVisibility('visible')

      expect(mockSilentRefresh).toHaveBeenCalledOnce()
    })

    it('does not refresh on visibility change when token is still valid', () => {
      loginWithExpiry(3600) // 1h ahead
      renderHook(() => useTokenRefresh(), { wrapper })
      mockSilentRefresh.mockClear()

      setVisibility('hidden')
      setVisibility('visible')

      expect(mockSilentRefresh).not.toHaveBeenCalled()
    })

    it('does not refresh on visibility change when user is not logged in', () => {
      // No token in store
      renderHook(() => useTokenRefresh(), { wrapper })

      setVisibility('hidden')
      setVisibility('visible')

      expect(mockSilentRefresh).not.toHaveBeenCalled()
    })

    it('removes the listener on unmount', () => {
      loginWithExpiry(-10)
      const { unmount } = renderHook(() => useTokenRefresh(), { wrapper })
      mockSilentRefresh.mockClear()

      unmount()
      setVisibility('visible')

      expect(mockSilentRefresh).not.toHaveBeenCalled()
    })
  })
})
