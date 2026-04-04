import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '../../store/auth'

// Mock fetch globally
const fetchSpy = vi.fn()
vi.stubGlobal('fetch', fetchSpy)

describe('reportError', () => {
  beforeEach(() => {
    fetchSpy.mockReset()
    fetchSpy.mockResolvedValue({ ok: true })
    useAuthStore.getState().clearAuth()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  async function loadReportError() {
    const mod = await import('../errorReporter')
    return mod.reportError
  }

  it('sends the error payload to /api/errors', async () => {
    const reportError = await loadReportError()
    const error = new Error('Something broke')

    await reportError(error)

    expect(fetchSpy).toHaveBeenCalledOnce()
    const [url, options] = fetchSpy.mock.calls[0]
    expect(url).toBe('/api/errors')
    expect(options.method).toBe('POST')

    const body = JSON.parse(options.body)
    expect(body.source).toBe('frontend')
    expect(body.message).toBe('Something broke')
    expect(body.stack).toBeDefined()
    expect(body.context.url).toBeDefined()
  })

  it('includes userId when the user is authenticated', async () => {
    useAuthStore.getState().setAuth(
      // Minimal JWT with exp claim
      `header.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.sig`,
      { id: 'user-123', email: 'a@b.com', emailVerified: true, role: 'user', isDemo: false } as any
    )

    const reportError = await loadReportError()
    await reportError(new Error('fail'))

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
    expect(body.userId).toBe('user-123')
  })

  it('omits userId when no user is logged in', async () => {
    const reportError = await loadReportError()
    await reportError(new Error('anon error'))

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
    expect(body.userId).toBeUndefined()
  })

  it('merges extra context into the payload', async () => {
    const reportError = await loadReportError()
    await reportError(new Error('ctx'), { page: 'settings', action: 'save' })

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
    expect(body.context.page).toBe('settings')
    expect(body.context.action).toBe('save')
    expect(body.context.url).toBeDefined()
  })

  it('never throws even if fetch rejects', async () => {
    fetchSpy.mockRejectedValue(new Error('network down'))

    const reportError = await loadReportError()
    // Should resolve without throwing
    await expect(reportError(new Error('boom'))).resolves.toBeUndefined()
  })
})
