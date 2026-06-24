import { QueryClient } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { httpClient } from '@/lib/httpClient'
import { useAuthStore } from '../../../store/auth'

vi.mock('@/lib/httpClient', () => ({
  httpClient: vi.fn(),
}))

import { __resetFreshness, __setClock, ensureFresh } from '../freshness'

const mockHttpClient = vi.mocked(httpClient)

describe('ensureFresh', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient()
    useAuthStore.getState().clearAuth()
    mockHttpClient.mockReset()
    __resetFreshness()
  })

  afterEach(() => {
    queryClient.clear()
    __setClock(null)
  })

  it('returns true and updates store + queryClient on success', async () => {
    const fakeUser = {
      id: 'u1',
      email: 'a@b.com',
      emailVerified: true,
      role: 'user',
      isDemo: false,
    }
    const fakeToken = `h.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.s`

    mockHttpClient.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ success: true, data: { accessToken: fakeToken, user: fakeUser } }),
    } as any)

    const result = await ensureFresh(queryClient)

    expect(result).toBe('ok')
    expect(useAuthStore.getState().accessToken).toBe(fakeToken)
    expect(useAuthStore.getState().user).toEqual(fakeUser)
    expect(queryClient.getQueryData(['session'])).toEqual({ authenticated: true, userId: 'u1' })
  })

  it("returns 'failed' when the server responds with !ok", async () => {
    mockHttpClient.mockResolvedValue({ ok: false } as any)

    const result = await ensureFresh(queryClient)

    expect(result).toBe('failed')
    expect(useAuthStore.getState().accessToken).toBeNull()
  })

  it("returns 'failed' when success is false in response body", async () => {
    mockHttpClient.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: false }),
    } as any)

    const result = await ensureFresh(queryClient)

    expect(result).toBe('failed')
  })

  it("returns 'failed' when the request throws", async () => {
    mockHttpClient.mockRejectedValue(new Error('network'))

    const result = await ensureFresh(queryClient)

    expect(result).toBe('failed')
  })

  it("returns 'cooldown' during the backoff window after a failure", async () => {
    // Drive the clock so the backoff window is deterministic, not real-time-within-one-tick.
    let nowMs = 1_000_000
    __setClock({ now: () => nowMs })
    mockHttpClient.mockRejectedValueOnce(new Error('network'))

    await ensureFresh(queryClient)
    expect(mockHttpClient).toHaveBeenCalledOnce()

    // 500ms into the 1s backoff window, second call short-circuits to 'cooldown'.
    nowMs += 500
    const result = await ensureFresh(queryClient)
    expect(result).toBe('cooldown')
    expect(mockHttpClient).toHaveBeenCalledOnce()
  })

  it('deduplicates concurrent calls', async () => {
    const fakeUser = {
      id: 'u2',
      email: 'b@c.com',
      emailVerified: true,
      role: 'user',
      isDemo: false,
    }
    const fakeToken = `h.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.s`

    mockHttpClient.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ success: true, data: { accessToken: fakeToken, user: fakeUser } }),
    } as any)

    const [r1, r2] = await Promise.all([ensureFresh(queryClient), ensureFresh(queryClient)])

    expect(r1).toBe('ok')
    expect(r2).toBe('ok')
    expect(mockHttpClient).toHaveBeenCalledOnce()
  })
})
