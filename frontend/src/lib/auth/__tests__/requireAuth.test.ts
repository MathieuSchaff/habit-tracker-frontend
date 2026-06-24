import { QueryClient } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '../../../store/auth'

// Partial mock: keep the real isExpired (drives the local-token branch), stub only the network refresh.
vi.mock('../freshness', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../freshness')>()),
  ensureFresh: vi.fn(),
}))

vi.mock('../../queries/auth', () => ({
  authQueries: {
    session: () => ({
      queryKey: ['session'],
      queryFn: vi.fn().mockResolvedValue({ authenticated: true }),
    }),
  },
}))

import { ensureFresh } from '../freshness'
import { requireAuth } from '../requireAuth'

const mockEnsureFresh = vi.mocked(ensureFresh)

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
    mockEnsureFresh.mockReset()
  })

  afterEach(() => {
    queryClient.clear()
  })

  it('does nothing when the token is valid and session check passes', async () => {
    setAuthenticated()

    await expect(
      requireAuth({
        queryClient,
        href: '/dashboard',
        accessToken: useAuthStore.getState().accessToken,
      })
    ).resolves.toBeUndefined()
  })

  it('attempts silent refresh when no token exists', async () => {
    mockEnsureFresh.mockResolvedValue('ok')

    await expect(
      requireAuth({
        queryClient,
        href: '/dashboard',
        accessToken: useAuthStore.getState().accessToken,
      })
    ).resolves.toBeUndefined()

    expect(mockEnsureFresh).toHaveBeenCalledWith(queryClient)
  })

  it('redirects to login when no token and refresh fails', async () => {
    mockEnsureFresh.mockResolvedValue('failed')

    try {
      await requireAuth({
        queryClient,
        href: '/dashboard',
        accessToken: useAuthStore.getState().accessToken,
      })
      expect.unreachable('should have thrown redirect')
    } catch {
      expect(useAuthStore.getState().accessToken).toBeNull()
    }
  })

  it("redirects when no token and refresh is in 'cooldown'", async () => {
    mockEnsureFresh.mockResolvedValue('cooldown')

    try {
      await requireAuth({ queryClient, href: '/dashboard', accessToken: null })
      expect.unreachable('should have thrown redirect')
    } catch {
      expect(useAuthStore.getState().accessToken).toBeNull()
    }
  })

  it("does NOT redirect when expired token and refresh is in 'cooldown'", async () => {
    // Expired token + cooldown = possible network blip; keep the user in.
    const expiredToken = `h.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 60 }))}.s`
    useAuthStore.getState().setAuth(expiredToken, {
      id: 'u1',
      email: 'a@b.com',
      emailVerified: true,
      role: 'user',
      isDemo: false,
    } as any)
    mockEnsureFresh.mockResolvedValue('cooldown')

    await expect(
      requireAuth({ queryClient, href: '/dashboard', accessToken: expiredToken })
    ).resolves.toBeUndefined()
    expect(useAuthStore.getState().accessToken).toBe(expiredToken)
  })

  it('attempts silent refresh when token looks valid but server rejects session', async () => {
    setAuthenticated()

    vi.spyOn(queryClient, 'ensureQueryData').mockRejectedValueOnce(new Error('Unauthorized'))
    mockEnsureFresh.mockResolvedValue('ok')

    await expect(
      requireAuth({
        queryClient,
        href: '/settings',
        accessToken: useAuthStore.getState().accessToken,
      })
    ).resolves.toBeUndefined()

    expect(mockEnsureFresh).toHaveBeenCalledWith(queryClient)
  })

  it('redirects when token looks valid, server rejects, and refresh fails', async () => {
    setAuthenticated()

    vi.spyOn(queryClient, 'ensureQueryData').mockRejectedValueOnce(new Error('Unauthorized'))
    mockEnsureFresh.mockResolvedValue('failed')

    try {
      await requireAuth({
        queryClient,
        href: '/settings',
        accessToken: useAuthStore.getState().accessToken,
      })
      expect.unreachable('should have thrown redirect')
    } catch {
      expect(useAuthStore.getState().accessToken).toBeNull()
    }
  })

  it("does NOT redirect when server rejects but refresh is in 'cooldown'", async () => {
    setAuthenticated()
    const tokenBefore = useAuthStore.getState().accessToken

    vi.spyOn(queryClient, 'ensureQueryData').mockRejectedValueOnce(new Error('Unauthorized'))
    mockEnsureFresh.mockResolvedValue('cooldown')

    await expect(
      requireAuth({ queryClient, href: '/settings', accessToken: tokenBefore })
    ).resolves.toBeUndefined()
    // User stays logged in through the backoff blip.
    expect(useAuthStore.getState().accessToken).toBe(tokenBefore)
  })

  it('attempts refresh when token is expired', async () => {
    const expiredToken = `h.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 60 }))}.s`
    useAuthStore.getState().setAuth(expiredToken, {
      id: 'u1',
      email: 'a@b.com',
      emailVerified: true,
      role: 'user',
      isDemo: false,
    } as any)

    mockEnsureFresh.mockResolvedValue('ok')

    await expect(
      requireAuth({
        queryClient,
        href: '/profile',
        accessToken: useAuthStore.getState().accessToken,
      })
    ).resolves.toBeUndefined()

    expect(mockEnsureFresh).toHaveBeenCalledWith(queryClient)
  })
})
