import { QueryClient } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '../../../store/auth'

// Mock silentRefresh
vi.mock('../../queries/silentRefresh', () => ({
  silentRefresh: vi.fn(),
}))

// Mock authQueries.session()
vi.mock('../../queries/auth', () => ({
  authQueries: {
    session: () => ({
      queryKey: ['session'],
      queryFn: vi.fn().mockResolvedValue({ authenticated: true }),
    }),
  },
}))

import { silentRefresh } from '../../queries/silentRefresh'
import { requireAuth } from '../requireAuth'

const mockSilentRefresh = vi.mocked(silentRefresh)

function setAuthenticated() {
  const token = `h.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.s`
  useAuthStore.getState().setAuth(token, {
    id: 'u1',
    email: 'a@b.com',
    emailVerified: true,
    role: 'user',
    isDemo: false,
  } as any)
}

describe('requireAuth', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient()
    useAuthStore.getState().clearAuth()
    mockSilentRefresh.mockReset()
  })

  afterEach(() => {
    queryClient.clear()
  })

  it('does nothing when the token is valid and session check passes', async () => {
    setAuthenticated()

    await expect(requireAuth({ queryClient, pathname: '/dashboard' })).resolves.toBeUndefined()
  })

  it('attempts silent refresh when no token exists', async () => {
    mockSilentRefresh.mockResolvedValue(true)

    await expect(requireAuth({ queryClient, pathname: '/dashboard' })).resolves.toBeUndefined()

    expect(mockSilentRefresh).toHaveBeenCalledWith(queryClient)
  })

  it('redirects to login when no token and refresh fails', async () => {
    mockSilentRefresh.mockResolvedValue(false)

    try {
      await requireAuth({ queryClient, pathname: '/dashboard' })
      expect.unreachable('should have thrown redirect')
    } catch {
      // Redirect thrown — store should be cleared
      expect(useAuthStore.getState().accessToken).toBeNull()
    }
  })

  it('attempts silent refresh when token looks valid but server rejects session', async () => {
    setAuthenticated()

    // Make ensureQueryData throw to simulate server rejection
    vi.spyOn(queryClient, 'ensureQueryData').mockRejectedValueOnce(new Error('Unauthorized'))
    mockSilentRefresh.mockResolvedValue(true)

    await expect(requireAuth({ queryClient, pathname: '/settings' })).resolves.toBeUndefined()

    expect(mockSilentRefresh).toHaveBeenCalledWith(queryClient)
  })

  it('redirects when token looks valid, server rejects, and refresh fails', async () => {
    setAuthenticated()

    vi.spyOn(queryClient, 'ensureQueryData').mockRejectedValueOnce(new Error('Unauthorized'))
    mockSilentRefresh.mockResolvedValue(false)

    try {
      await requireAuth({ queryClient, pathname: '/settings' })
      expect.unreachable('should have thrown redirect')
    } catch {
      // Redirect thrown — store and queries should be cleared
      expect(useAuthStore.getState().accessToken).toBeNull()
    }
  })

  it('attempts refresh when token is expired', async () => {
    // Set an already-expired token
    const expiredToken = `h.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 60 }))}.s`
    useAuthStore.getState().setAuth(expiredToken, {
      id: 'u1',
      email: 'a@b.com',
      emailVerified: true,
      role: 'user',
      isDemo: false,
    } as any)

    mockSilentRefresh.mockResolvedValue(true)

    await expect(requireAuth({ queryClient, pathname: '/profile' })).resolves.toBeUndefined()

    expect(mockSilentRefresh).toHaveBeenCalledWith(queryClient)
  })
})
