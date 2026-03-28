import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@habit-tracker/shared'

import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { createTestApp } from '../../../tests/helpers/createTestApp'
import { createTestUser } from '../../../tests/helpers/test-factories'

function jsonPost(app: Hono<AppEnv>, path: string, body: object, headers?: Record<string, string>) {
  return app.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

async function mobileLogin(app: Hono<AppEnv>, email: string, password: string) {
  const res = await jsonPost(app, '/auth/mobile/login', { email, password })
  const data = await res.json()
  return { res, data }
}

async function mobileSignup(app: Hono<AppEnv>, email: string, password: string) {
  const res = await jsonPost(app, '/auth/mobile/signup', { email, password })
  const data = await res.json()
  return { res, data }
}

describe('Auth Routes (mobile)', () => {
  let app: Hono<AppEnv>

  beforeEach(async () => {
    app = await createTestApp()
  })

  describe('POST /auth/mobile/signup', () => {
    it('should create a new user and return tokens in body', async () => {
      const { res, data } = await mobileSignup(app, 'newuser@test.com', 'TestPass123!')

      expect(res.status).toBe(HTTP_STATUS.CREATED)
      expect(data.success).toBe(true)
      expect(data.data.user.email).toBe('newuser@test.com')
      expect(data.data.accessToken).toBeDefined()
      expect(data.data.refreshToken).toBeDefined()

      const cookie = res.headers.get('Set-Cookie')
      expect(cookie).toBeNull()
    })

    it('should reject invalid email', async () => {
      const { res, data } = await mobileSignup(app, 'invalid-email', 'TestPass123!')

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.success).toBe(false)
    })

    it('should reject weak password', async () => {
      const { res, data } = await mobileSignup(app, 'test@test.com', 'weak')

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.success).toBe(false)
    })

    it('should reject duplicate email', async () => {
      await createTestUser('existing@test.com', 'TestPass123!')

      const { res, data } = await mobileSignup(app, 'existing@test.com', 'TestPass123!')

      expect(res.status).toBe(HTTP_STATUS.CONFLICT)
      expect(data.success).toBe(false)
      expect(data.error).toBe('email_exists')
    })

    it('should normalize email on signup', async () => {
      const { res, data } = await mobileSignup(app, '  NewUser@TEST.COM  ', 'TestPass123!')

      expect(res.status).toBe(HTTP_STATUS.CREATED)
      expect(data.data.user.email).toBe('newuser@test.com')
    })
  })

  describe('POST /auth/mobile/login', () => {
    it('should login and return tokens in body', async () => {
      await createTestUser('login@test.com', 'TestPass123!')

      const { res, data } = await mobileLogin(app, 'login@test.com', 'TestPass123!')

      expect(res.status).toBe(HTTP_STATUS.OK)
      expect(data.success).toBe(true)
      expect(data.data.user.email).toBe('login@test.com')
      expect(data.data.accessToken).toBeDefined()
      expect(data.data.refreshToken).toBeDefined()

      const cookie = res.headers.get('Set-Cookie')
      expect(cookie).toBeNull()
    })

    it('should reject wrong password', async () => {
      await createTestUser('login@test.com', 'TestPass123!')

      const { res, data } = await mobileLogin(app, 'login@test.com', 'WrongPass123!')

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
      expect(data.success).toBe(false)
      expect(data.error).toBe('invalid_credentials')
    })

    it('should reject non-existent user', async () => {
      const { res, data } = await mobileLogin(app, 'notfound@test.com', 'TestPass123!')

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
      expect(data.success).toBe(false)
      expect(data.error).toBe('invalid_credentials')
    })

    it('should reject invalid email format', async () => {
      const { res } = await mobileLogin(app, 'not-an-email', 'TestPass123!')
      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject empty body', async () => {
      const res = await jsonPost(app, '/auth/mobile/login', {})
      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })
  })

  describe('POST /auth/mobile/refresh', () => {
    it('should rotate tokens via body', async () => {
      await createTestUser('refresh@test.com', 'TestPass123!')
      const { data: loginData } = await mobileLogin(app, 'refresh@test.com', 'TestPass123!')

      const res = await jsonPost(app, '/auth/mobile/refresh', {
        refreshToken: loginData.data.refreshToken,
      })

      expect(res.status).toBe(HTTP_STATUS.OK)

      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.accessToken).toBeDefined()
      expect(data.data.refreshToken).toBeDefined()

      expect(data.data.refreshToken).not.toBe(loginData.data.refreshToken)
    })

    it('should fail without refreshToken in body', async () => {
      const res = await jsonPost(app, '/auth/mobile/refresh', {})

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('missing_refresh_token')
    })

    it('should fail with invalid refresh token', async () => {
      const res = await jsonPost(app, '/auth/mobile/refresh', {
        refreshToken: 'invalid.token.here',
      })

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('invalid_token')
    })

    it('should invalidate old refresh token after rotation', async () => {
      await createTestUser('refresh@test.com', 'TestPass123!')
      const { data: loginData } = await mobileLogin(app, 'refresh@test.com', 'TestPass123!')
      const oldRefresh = loginData.data.refreshToken

      const res1 = await jsonPost(app, '/auth/mobile/refresh', { refreshToken: oldRefresh })
      expect(res1.status).toBe(HTTP_STATUS.OK)

      const res2 = await jsonPost(app, '/auth/mobile/refresh', { refreshToken: oldRefresh })
      expect(res2.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })
  })

  describe('POST /auth/mobile/logout', () => {
    it('should logout with refresh token in body', async () => {
      await createTestUser('logout@test.com', 'TestPass123!')
      const { data: loginData } = await mobileLogin(app, 'logout@test.com', 'TestPass123!')

      const res = await jsonPost(
        app,
        '/auth/mobile/logout',
        { refreshToken: loginData.data.refreshToken },
        { Authorization: `Bearer ${loginData.data.accessToken}` }
      )

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
    })

    it('should reject logout without access token', async () => {
      const res = await jsonPost(app, '/auth/mobile/logout', {})
      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('should invalidate refresh token after logout', async () => {
      await createTestUser('logout@test.com', 'TestPass123!')
      const { data: loginData } = await mobileLogin(app, 'logout@test.com', 'TestPass123!')

      await jsonPost(
        app,
        '/auth/mobile/logout',
        { refreshToken: loginData.data.refreshToken },
        { Authorization: `Bearer ${loginData.data.accessToken}` }
      )

      const refreshRes = await jsonPost(app, '/auth/mobile/refresh', {
        refreshToken: loginData.data.refreshToken,
      })
      expect(refreshRes.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('should succeed even without refresh token in body', async () => {
      await createTestUser('logout@test.com', 'TestPass123!')
      const { data: loginData } = await mobileLogin(app, 'logout@test.com', 'TestPass123!')

      const res = await jsonPost(
        app,
        '/auth/mobile/logout',
        {},
        { Authorization: `Bearer ${loginData.data.accessToken}` }
      )

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
    })
  })
})
