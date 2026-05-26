import { describe, expect, it } from 'bun:test'

import type { Context } from 'hono'

import type { AppEnv } from '../../../app-env'
import { getAuthedUserId, getAuthedUserRole } from '../middleware'

// Pure test: stub only the .get the accessors read; no DB, no app.
function ctx(vars: Partial<{ userId: string; userRole: string }>): Context<AppEnv> {
  return { get: (k: 'userId' | 'userRole') => vars[k] } as unknown as Context<AppEnv>
}

describe('authed context accessors', () => {
  it('getAuthedUserId returns the id when requireJwtAuth set it', () => {
    expect(getAuthedUserId(ctx({ userId: 'u1' }))).toBe('u1')
  })

  it('getAuthedUserId throws when userId is absent (guard did not run)', () => {
    expect(() => getAuthedUserId(ctx({}))).toThrow('requireJwtAuth')
  })

  it('getAuthedUserRole returns the role when requireJwtAuth set it', () => {
    expect(getAuthedUserRole(ctx({ userRole: 'admin' }))).toBe('admin')
  })

  it('getAuthedUserRole throws when userRole is absent (guard did not run)', () => {
    expect(() => getAuthedUserRole(ctx({}))).toThrow('requireJwtAuth')
  })
})
