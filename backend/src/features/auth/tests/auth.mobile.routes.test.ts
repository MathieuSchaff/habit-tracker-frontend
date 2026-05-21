import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@habit-tracker/shared'

import { setupDbTests } from '../../../tests/db-setup'
import {
  createTestClient,
  type TestClient,
  withAuth,
} from '../../../tests/helpers/createTestClient'
import { createTestUser } from '../../../tests/helpers/test-factories'

async function mobileLogin(client: TestClient, email: string, password: string) {
  const res = await client.auth.mobile.login.$post({ json: { email, password } })
  const data = await res.json()
  return { res, data }
}

async function mobileSignup(client: TestClient, email: string, password: string) {
  const res = await client.auth.mobile.signup.$post({ json: { email, password } })
  const data = await res.json()
  return { res, data }
}

setupDbTests()

describe('Auth Routes (mobile)', () => {
  let client: TestClient

  beforeEach(async () => {
    client = await createTestClient()
  })

  describe('POST /auth/mobile/signup', () => {
    it('should create a new user and return tokens in body', async () => {
      const { res, data } = await mobileSignup(client, 'newuser@test.com', 'TestPass123!')

      expect(res.status).toBe(HTTP_STATUS.CREATED)
      expect(data.success).toBe(true)
      if (!data.success) throw new Error('mobile signup failed')
      expect(data.data.user.email).toBe('newuser@test.com')
      expect(data.data.accessToken).toBeDefined()
      expect(data.data.refreshToken).toBeDefined()

      const cookie = res.headers.get('Set-Cookie')
      expect(cookie).toBeNull()
    })

    it('should reject invalid email', async () => {
      const { res, data } = await mobileSignup(client, 'invalid-email', 'TestPass123!')

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.success).toBe(false)
    })

    it('should reject weak password', async () => {
      const { res, data } = await mobileSignup(client, 'test@test.com', 'weak')

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.success).toBe(false)
    })

    it('should reject duplicate email', async () => {
      await createTestUser('existing@test.com', 'TestPass123!')

      const { res, data } = await mobileSignup(client, 'existing@test.com', 'TestPass123!')

      expect(res.status).toBe(HTTP_STATUS.CONFLICT)
      expect(data.success).toBe(false)
      if (!data.success) expect(data.error).toBe('email_exists')
    })

    it('should normalize email on signup', async () => {
      const { res, data } = await mobileSignup(client, '  NewUser@TEST.COM  ', 'TestPass123!')

      expect(res.status).toBe(HTTP_STATUS.CREATED)
      if (!data.success) throw new Error('mobile signup failed')
      expect(data.data.user.email).toBe('newuser@test.com')
    })
  })

  describe('POST /auth/mobile/login', () => {
    it('should login and return tokens in body', async () => {
      await createTestUser('login@test.com', 'TestPass123!')

      const { res, data } = await mobileLogin(client, 'login@test.com', 'TestPass123!')

      expect(res.status).toBe(HTTP_STATUS.OK)
      expect(data.success).toBe(true)
      if (!data.success) throw new Error('mobile login failed')
      expect(data.data.user.email).toBe('login@test.com')
      expect(data.data.accessToken).toBeDefined()
      expect(data.data.refreshToken).toBeDefined()

      const cookie = res.headers.get('Set-Cookie')
      expect(cookie).toBeNull()
    })

    it('should reject wrong password', async () => {
      await createTestUser('login@test.com', 'TestPass123!')

      const { res, data } = await mobileLogin(client, 'login@test.com', 'WrongPass123!')

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
      expect(data.success).toBe(false)
      if (!data.success) expect(data.error).toBe('invalid_credentials')
    })

    it('should reject non-existent user', async () => {
      const { res, data } = await mobileLogin(client, 'notfound@test.com', 'TestPass123!')

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
      expect(data.success).toBe(false)
      if (!data.success) expect(data.error).toBe('invalid_credentials')
    })

    it('should reject invalid email format', async () => {
      const { res } = await mobileLogin(client, 'not-an-email', 'TestPass123!')
      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject empty body', async () => {
      const res = await client.auth.mobile.login.$post({
        // @ts-expect-error — exercising the validator with an empty body
        json: {},
      })
      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })
  })

  describe('POST /auth/mobile/refresh', () => {
    it('should rotate tokens via body', async () => {
      await createTestUser('refresh@test.com', 'TestPass123!')
      const { data: loginData } = await mobileLogin(client, 'refresh@test.com', 'TestPass123!')
      if (!loginData.success) throw new Error('mobile login failed')
      const oldRefreshToken = loginData.data.refreshToken

      const res = await client.auth.mobile.refresh.$post({
        json: { refreshToken: oldRefreshToken },
      })

      expect(res.status).toBe(HTTP_STATUS.OK)

      const data = await res.json()
      expect(data.success).toBe(true)
      if (!data.success) throw new Error('mobile refresh failed')
      expect(data.data.accessToken).toBeDefined()
      expect(data.data.refreshToken).toBeDefined()

      expect(data.data.refreshToken).not.toBe(oldRefreshToken)
    })

    it('should fail without refreshToken in body', async () => {
      const res = await client.auth.mobile.refresh.$post({
        json: {},
      })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
      const data = await res.json()
      expect(data.success).toBe(false)
      if (!data.success) expect(data.error).toBe('missing_refresh_token')
    })

    it('should fail with invalid refresh token', async () => {
      const res = await client.auth.mobile.refresh.$post({
        json: { refreshToken: 'invalid.token.here' },
      })

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
      const data = await res.json()
      expect(data.success).toBe(false)
      if (!data.success) expect(data.error).toBe('invalid_token')
    })

    it('should invalidate old refresh token after rotation', async () => {
      await createTestUser('refresh@test.com', 'TestPass123!')
      const { data: loginData } = await mobileLogin(client, 'refresh@test.com', 'TestPass123!')
      if (!loginData.success) throw new Error('mobile login failed')
      const oldRefresh = loginData.data.refreshToken

      const res1 = await client.auth.mobile.refresh.$post({
        json: { refreshToken: oldRefresh },
      })
      expect(res1.status).toBe(HTTP_STATUS.OK)

      const res2 = await client.auth.mobile.refresh.$post({
        json: { refreshToken: oldRefresh },
      })
      expect(res2.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })
  })

  describe('POST /auth/mobile/logout', () => {
    it('should logout with refresh token in body', async () => {
      await createTestUser('logout@test.com', 'TestPass123!')
      const { data: loginData } = await mobileLogin(client, 'logout@test.com', 'TestPass123!')
      if (!loginData.success) throw new Error('mobile login failed')

      const res = await client.auth.mobile.logout.$post(
        { json: { refreshToken: loginData.data.refreshToken } },
        withAuth(loginData.data.accessToken)
      )

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
    })

    it('should reject logout without access token', async () => {
      const res = await client.auth.mobile.logout.$post({
        json: {},
      })
      // Middleware-issued 401 is outside the route's inferred status union.
      expect(res.status as number).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('should invalidate refresh token after logout', async () => {
      await createTestUser('logout@test.com', 'TestPass123!')
      const { data: loginData } = await mobileLogin(client, 'logout@test.com', 'TestPass123!')
      if (!loginData.success) throw new Error('mobile login failed')

      await client.auth.mobile.logout.$post(
        { json: { refreshToken: loginData.data.refreshToken } },
        withAuth(loginData.data.accessToken)
      )

      const refreshRes = await client.auth.mobile.refresh.$post({
        json: { refreshToken: loginData.data.refreshToken },
      })
      expect(refreshRes.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('should succeed even without refresh token in body', async () => {
      await createTestUser('logout@test.com', 'TestPass123!')
      const { data: loginData } = await mobileLogin(client, 'logout@test.com', 'TestPass123!')
      if (!loginData.success) throw new Error('mobile login failed')

      const res = await client.auth.mobile.logout.$post(
        { json: {} },
        withAuth(loginData.data.accessToken)
      )

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
    })
  })
})
