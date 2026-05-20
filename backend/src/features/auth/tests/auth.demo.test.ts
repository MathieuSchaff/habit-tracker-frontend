import { afterEach, beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@habit-tracker/shared'

import { createTestClient, type TestClient } from '../../../tests/helpers/createTestClient'
import { cleanDatabase } from '../../../tests/helpers/db-cleaner'

describe('POST /auth/demo', () => {
  let client: TestClient

  beforeEach(async () => {
    await cleanDatabase()
    client = await createTestClient()
  })

  afterEach(async () => {
    await cleanDatabase()
  })

  it('should create a demo user and return tokens', async () => {
    const res = await client.auth.demo.$post()

    expect(res.status).toBe(HTTP_STATUS.CREATED)

    const data = await res.json()
    expect(data.success).toBe(true)
    if (!data.success) throw new Error('demo signup failed')
    expect(data.data.user.email).toContain('@demo.local')
    expect(data.data.user.isDemo).toBe(true)
    expect(data.data.accessToken).toBeDefined()
    expect((data.data as { refreshToken?: string }).refreshToken).toBeUndefined()

    const cookie = res.headers.get('Set-Cookie') ?? ''
    expect(cookie).toContain('refresh_token=')
    expect(cookie).toContain('HttpOnly')
  })

  it('each call creates a fresh independent demo account', async () => {
    const res1 = await client.auth.demo.$post()
    const res2 = await client.auth.demo.$post()
    const data1 = await res1.json()
    const data2 = await res2.json()

    expect(res1.status).toBe(HTTP_STATUS.CREATED)
    expect(res2.status).toBe(HTTP_STATUS.CREATED)

    if (!data1.success || !data2.success) throw new Error('demo signup failed')
    expect(data1.data.user.email).not.toBe(data2.data.user.email)
  })
})
