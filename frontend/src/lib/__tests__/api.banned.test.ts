import { HttpResponse, http } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'

import { useAuthStore } from '../../store/auth'
import { server } from '../../test/msw/server'
import { api } from '../api'

describe('authFetch — 403 banned interceptor', () => {
  beforeEach(() => {
    useAuthStore.setState({ banned: false, bannedDetails: null })
  })

  it('sets banned flag and details on 403 banned response', async () => {
    server.use(
      http.get('*/api/auth/session', () =>
        HttpResponse.json(
          {
            success: false,
            error: 'banned',
            details: { expiresAt: '2026-06-01T00:00:00.000Z', reason: 'Comportement abusif' },
          },
          { status: 403 }
        )
      )
    )

    await api.auth.session.$get()

    expect(useAuthStore.getState().banned).toBe(true)
    expect(useAuthStore.getState().bannedDetails).toEqual({
      expiresAt: '2026-06-01T00:00:00.000Z',
      reason: 'Comportement abusif',
    })
  })

  it('sets banned with null details when expiresAt and reason are null', async () => {
    server.use(
      http.get('*/api/auth/session', () =>
        HttpResponse.json(
          { success: false, error: 'banned', details: { expiresAt: null, reason: null } },
          { status: 403 }
        )
      )
    )

    await api.auth.session.$get()

    expect(useAuthStore.getState().banned).toBe(true)
    expect(useAuthStore.getState().bannedDetails).toEqual({ expiresAt: null, reason: null })
  })

  it('does not set banned flag on non-banned 403', async () => {
    server.use(
      http.get('*/api/auth/session', () =>
        HttpResponse.json({ success: false, error: 'forbidden' }, { status: 403 })
      )
    )

    await api.auth.session.$get()

    expect(useAuthStore.getState().banned).toBe(false)
  })
})
