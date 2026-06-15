import { afterEach, beforeEach, describe, expect, it } from 'bun:test'

import type { Context } from 'hono'

import type { AppEnv } from '../../app-env'
import { errorGroups, errorOccurrences } from '../../db/schema'
import { testDb } from '../../tests/db.test.config'
import { setupDbTests } from '../../tests/db-setup'
import { globalErrorHandler } from './error-handler'

setupDbTests()

// Minimal Context stand-in: the handler only reads req.path/method + userId and
// calls c.json. trackError uses the base db pool, not the context.
function fakeContext(userId?: string): Context<AppEnv> {
  return {
    req: { path: '/api/boom', method: 'GET' },
    get: (key: string) => (key === 'userId' ? userId : undefined),
    json: (body: unknown, status?: number) => ({ body, status }),
  } as unknown as Context<AppEnv>
}

describe('globalErrorHandler', () => {
  beforeEach(async () => {
    await testDb.delete(errorOccurrences)
    await testDb.delete(errorGroups)
  })

  afterEach(async () => {
    await testDb.delete(errorOccurrences)
    await testDb.delete(errorGroups)
  })

  it('persists an unhandled internal error as source=backend', async () => {
    await globalErrorHandler(new Error('boom'), fakeContext())

    const groups = await testDb.select().from(errorGroups)
    expect(groups).toHaveLength(1)
    expect(groups[0].source).toBe('backend')
    expect(groups[0].message).toBe('boom')

    const occurrences = await testDb.select().from(errorOccurrences)
    expect(occurrences).toHaveLength(1)
  })

  it('does not persist a mapped app error (has a code)', async () => {
    const appError = Object.assign(new Error('nope'), { code: 'not_found' })
    await globalErrorHandler(appError, fakeContext())

    const groups = await testDb.select().from(errorGroups)
    expect(groups).toHaveLength(0)
  })
})
