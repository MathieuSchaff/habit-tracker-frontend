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

    await expect(
      requireAuth({
        queryClient,
        pathname: '/dashboard',
        accessToken: useAuthStore.getState().accessToken,
      })
    ).resolves.toBeUndefined()
  })

  it('attempts silent refresh when no token exists', async () => {
    mockSilentRefresh.mockResolvedValue('ok')

    await expect(
      requireAuth({
        queryClient,
        pathname: '/dashboard',
        accessToken: useAuthStore.getState().accessToken,
      })
    ).resolves.toBeUndefined()

    expect(mockSilentRefresh).toHaveBeenCalledWith(queryClient)
  })

  it('redirects to login when no token and refresh fails', async () => {
    mockSilentRefresh.mockResolvedValue('failed')

    try {
      await requireAuth({
        queryClient,
        pathname: '/dashboard',
        accessToken: useAuthStore.getState().accessToken,
      })
      expect.unreachable('should have thrown redirect')
    } catch {
      // Redirect thrown — store should be cleared
      expect(useAuthStore.getState().accessToken).toBeNull()
    }
  })

  it("redirects when no token and refresh is in 'cooldown'", async () => {
    mockSilentRefresh.mockResolvedValue('cooldown')

    try {
      await requireAuth({ queryClient, pathname: '/dashboard', accessToken: null })
      expect.unreachable('should have thrown redirect')
    } catch {
      expect(useAuthStore.getState().accessToken).toBeNull()
    }
  })

  it("does NOT redirect when expired token and refresh is in 'cooldown'", async () => {
    // Expired token = user had a session; cooldown = possible network blip, be lenient
    const expiredToken = `h.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 60 }))}.s`
    useAuthStore.getState().setAuth(expiredToken, {
      id: 'u1',
      email: 'a@b.com',
      emailVerified: true,
      role: 'user',
      isDemo: false,
    } as any)
    mockSilentRefresh.mockResolvedValue('cooldown')

    await expect(
      requireAuth({ queryClient, pathname: '/dashboard', accessToken: expiredToken })
    ).resolves.toBeUndefined()
    expect(useAuthStore.getState().accessToken).toBe(expiredToken)
  })

  it('attempts silent refresh when token looks valid but server rejects session', async () => {
    setAuthenticated()

    // Make ensureQueryData throw to simulate server rejection
    vi.spyOn(queryClient, 'ensureQueryData').mockRejectedValueOnce(new Error('Unauthorized'))
    mockSilentRefresh.mockResolvedValue('ok')

    await expect(
      requireAuth({
        queryClient,
        pathname: '/settings',
        accessToken: useAuthStore.getState().accessToken,
      })
    ).resolves.toBeUndefined()

    expect(mockSilentRefresh).toHaveBeenCalledWith(queryClient)
  })

  it('redirects when token looks valid, server rejects, and refresh fails', async () => {
    setAuthenticated()

    vi.spyOn(queryClient, 'ensureQueryData').mockRejectedValueOnce(new Error('Unauthorized'))
    mockSilentRefresh.mockResolvedValue('failed')

    try {
      await requireAuth({
        queryClient,
        pathname: '/settings',
        accessToken: useAuthStore.getState().accessToken,
      })
      expect.unreachable('should have thrown redirect')
    } catch {
      // Redirect thrown — store and queries should be cleared
      expect(useAuthStore.getState().accessToken).toBeNull()
    }
  })

  it("does NOT redirect when server rejects but refresh is in 'cooldown'", async () => {
    setAuthenticated()
    const tokenBefore = useAuthStore.getState().accessToken

    vi.spyOn(queryClient, 'ensureQueryData').mockRejectedValueOnce(new Error('Unauthorized'))
    mockSilentRefresh.mockResolvedValue('cooldown')

    await expect(
      requireAuth({ queryClient, pathname: '/settings', accessToken: tokenBefore })
    ).resolves.toBeUndefined()
    // Token preserved — user not kicked out on a backoff blip.
    expect(useAuthStore.getState().accessToken).toBe(tokenBefore)
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

    mockSilentRefresh.mockResolvedValue('ok')

    await expect(
      requireAuth({
        queryClient,
        pathname: '/profile',
        accessToken: useAuthStore.getState().accessToken,
      })
    ).resolves.toBeUndefined()

    expect(mockSilentRefresh).toHaveBeenCalledWith(queryClient)
  })
})
