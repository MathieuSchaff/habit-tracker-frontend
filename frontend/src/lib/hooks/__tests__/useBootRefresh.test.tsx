import type { UserPublic } from '@aurore/shared'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { httpClient } from '@/lib/httpClient'
import { useAuthStore } from '@/store/auth'

vi.mock('@/lib/httpClient', () => ({
  httpClient: vi.fn(),
}))

import { __resetFreshness } from '../../auth/freshness'
import { useBootRefresh } from '../useBootRefresh'

const mockHttpClient = vi.mocked(httpClient)
const mockUseRouter = vi.mocked(useRouter)

describe('useBootRefresh', () => {
  let queryClient: QueryClient

  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  beforeEach(() => {
    queryClient = new QueryClient()
    __resetFreshness()
    document.cookie = 'aurore_session=1; path=/'
    useAuthStore.setState({
      accessToken: null,
      tokenExpiresAt: null,
      user: null,
      emailVerified: false,
      role: 'user',
      isDemo: false,
      bootRefreshAttempted: false,
      bootRefreshPending: false,
      sessionExpired: false,
      banned: false,
      bannedDetails: null,
    })
  })

  afterEach(() => {
    document.cookie = 'aurore_session=; max-age=0; path=/'
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('reconciles active route data after restoring a hinted session', async () => {
    const invalidate = vi.fn().mockResolvedValue(undefined)
    mockUseRouter.mockReturnValue({ invalidate } as unknown as ReturnType<typeof useRouter>)
    const user = {
      id: 'u1',
      email: 'test@example.com',
      emailVerified: true,
      role: 'user',
      isDemo: false,
    } as UserPublic
    const accessToken = `h.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.s`
    mockHttpClient.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { accessToken, user } }),
    } as Response)

    renderHook(() => useBootRefresh(), { wrapper })

    await waitFor(() => expect(invalidate).toHaveBeenCalledOnce())
    expect(useAuthStore.getState()).toMatchObject({
      accessToken,
      user,
      bootRefreshAttempted: true,
      bootRefreshPending: false,
    })
  })
})
