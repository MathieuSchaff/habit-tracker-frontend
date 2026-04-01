import { afterEach, beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@habit-tracker/shared'

import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { createTestApp } from '../../../tests/helpers/createTestApp'
import { cleanDatabase } from '../../../tests/helpers/db-cleaner'

describe('POST /auth/demo', () => {
  let app: Hono<AppEnv>

  beforeEach(async () => {
    await cleanDatabase()
    app = await createTestApp()
  })

  afterEach(async () => {
    await cleanDatabase()
  })

  it('should create a demo user and return tokens', async () => {
    const res = await app.request('/auth/demo', { method: 'POST' })

    expect(res.status).toBe(HTTP_STATUS.CREATED)

    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data.user.email).toContain('@demo.local')
    expect(data.data.user.isDemo).toBe(true)
    expect(data.data.accessToken).toBeDefined()
    expect(data.data.refreshToken).toBeUndefined()

    const cookie = res.headers.get('Set-Cookie') ?? ''
    expect(cookie).toContain('refresh_token=')
    expect(cookie).toContain('HttpOnly')
  })

  it('each call creates a fresh independent demo account', async () => {
    const res1 = await app.request('/auth/demo', { method: 'POST' })
    const res2 = await app.request('/auth/demo', { method: 'POST' })
    const data1 = await res1.json()
    const data2 = await res2.json()

    expect(res1.status).toBe(HTTP_STATUS.CREATED)
    expect(res2.status).toBe(HTTP_STATUS.CREATED)

    expect(data1.data.user.email).not.toBe(data2.data.user.email)
  })
})
