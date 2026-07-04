import { describe, expect, it } from 'bun:test'

import type { Context } from 'hono'

import type { AppEnv } from '../../app-env'
import { globalErrorHandler } from './error-handler'

// Minimal Context stand-in: the handler only reads req.path/method and calls c.json.
function fakeContext(userId?: string): Context<AppEnv> {
  return {
    req: { path: '/api/boom', method: 'GET' },
    get: (key: string) => (key === 'userId' ? userId : undefined),
    json: (body: unknown, status?: number) => ({ body, status }),
  } as unknown as Context<AppEnv>
}

describe('globalErrorHandler', () => {
  it('returns server_error for an unhandled internal error', async () => {
    const res = await globalErrorHandler(new Error('boom'), fakeContext())

    expect(res).toMatchObject({
      body: { success: false, error: 'server_error' },
      status: 500,
    })
  })

  it('returns the mapped code for an app error', async () => {
    const appError = Object.assign(new Error('nope'), { code: 'not_found' })
    const res = await globalErrorHandler(appError, fakeContext())

    expect(res).toMatchObject({
      body: { success: false, error: 'not_found' },
      status: 404,
    })
  })
})
