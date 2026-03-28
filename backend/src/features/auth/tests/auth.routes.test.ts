import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@habit-tracker/shared'

import { eq } from 'drizzle-orm'
import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { testDb } from '../../../tests/db.test.config'
import { createTestApp } from '../../../tests/helpers/createTestApp'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'
import { createTestUser } from '../../../tests/helpers/test-factories'

function jsonPost(app: Hono<AppEnv>, path: string, body: object, headers?: Record<string, string>) {
  return app.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

function extractCookie(res: Response): string {
  return res.headers.get('Set-Cookie') ?? ''
}

async function loginAndGetCookies(app: Hono<AppEnv>, email: string, password: string) {
  const res = await jsonPost(app, '/auth/login', { email, password })
  const data = await res.json()
  const cookie = extractCookie(res)
  return { res, data, cookie, accessToken: data.data?.accessToken as string }
}

describe('Auth Routes (browser)', () => {
  let app: Hono<AppEnv>

  beforeEach(async () => {
    app = await createTestApp()
  })

  describe('POST /auth/signup', () => {
    it('should create a new user and set refresh token cookie', async () => {
      const creds = TEST_CREDENTIALS.toto

      const res = await jsonPost(app, '/auth/signup', {
        email: creds.rawEmail,
        password: creds.rawPassword,
      })

      expect(res.status).toBe(HTTP_STATUS.CREATED)

      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.user.email).toBe(creds.rawEmail)
      expect(data.data.accessToken).toBeDefined()

      expect(data.data.refreshToken).toBeUndefined()

      const cookie = extractCookie(res)
      expect(cookie).toContain('refresh_token=')
      expect(cookie).toContain('HttpOnly')
    })

    it('should signup Alice successfully', async () => {
      const creds = TEST_CREDENTIALS.alice

      const res = await jsonPost(app, '/auth/signup', {
        email: creds.rawEmail,
        password: creds.rawPassword,
      })

      expect(res.status).toBe(HTTP_STATUS.CREATED)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.user.email).toBe(creds.rawEmail)
    })

    it('should signup Jean-Michel (hyphenated email)', async () => {
      const creds = TEST_CREDENTIALS.jeanmichel

      const res = await jsonPost(app, '/auth/signup', {
        email: creds.rawEmail,
        password: creds.rawPassword,
      })

      expect(res.status).toBe(HTTP_STATUS.CREATED)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.user.email).toBe(creds.rawEmail)
    })

    it('should reject invalid email format', async () => {
      const res = await jsonPost(app, '/auth/signup', {
        email: 'invalid-email',
        password: TEST_CREDENTIALS.toto.rawPassword,
      })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
      const data = await res.json()
      expect(data.success).toBe(false)
    })

    it('should reject empty email', async () => {
      const res = await jsonPost(app, '/auth/signup', {
        email: '',
        password: TEST_CREDENTIALS.toto.rawPassword,
      })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
      const data = await res.json()
      expect(data.success).toBe(false)
    })

    it('should reject too short password', async () => {
      const res = await jsonPost(app, '/auth/signup', {
        email: TEST_CREDENTIALS.toto.rawEmail,
        password: TEST_CREDENTIALS.invalide.motDePasseTropCourt,
      })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
      const data = await res.json()
      expect(data.success).toBe(false)
    })

    it('should reject weak password (no uppercase)', async () => {
      const res = await jsonPost(app, '/auth/signup', {
        email: TEST_CREDENTIALS.toto.rawEmail,
        password: TEST_CREDENTIALS.invalide.sansMajuscule,
      })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
      const data = await res.json()
      expect(data.success).toBe(false)
    })

    it('should reject weak password (no digit)', async () => {
      const res = await jsonPost(app, '/auth/signup', {
        email: TEST_CREDENTIALS.toto.rawEmail,
        password: TEST_CREDENTIALS.invalide.sansChiffre,
      })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
      const data = await res.json()
      expect(data.success).toBe(false)
    })

    it('should reject weak password (no special char)', async () => {
      const res = await jsonPost(app, '/auth/signup', {
        email: TEST_CREDENTIALS.toto.rawEmail,
        password: TEST_CREDENTIALS.invalide.sansCaractereSpecial,
      })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
      const data = await res.json()
      expect(data.success).toBe(false)
    })

    it('should reject empty password', async () => {
      const res = await jsonPost(app, '/auth/signup', {
        email: TEST_CREDENTIALS.toto.rawEmail,
        password: '',
      })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
      const data = await res.json()
      expect(data.success).toBe(false)
    })

    it('should reject duplicate email', async () => {
      const creds = TEST_CREDENTIALS.toto
      await createTestUser(creds.rawEmail, creds.rawPassword)

      const res = await jsonPost(app, '/auth/signup', {
        email: creds.rawEmail,
        password: creds.rawPassword,
      })

      expect(res.status).toBe(HTTP_STATUS.CONFLICT)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('email_exists')
    })

    it('should reject duplicate email with different casing', async () => {
      const creds = TEST_CREDENTIALS.toto
      await createTestUser(creds.rawEmail, creds.rawPassword)

      const res = await jsonPost(app, '/auth/signup', {
        email: 'TOTO@EXEMPLE.FR',
        password: creds.rawPassword,
      })

      expect(res.status).toBe(HTTP_STATUS.CONFLICT)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('email_exists')
    })

    it('should normalize email on signup', async () => {
      const res = await jsonPost(app, '/auth/signup', {
        email: '  TOTO@EXEMPLE.FR  ',
        password: TEST_CREDENTIALS.toto.rawPassword,
      })

      expect(res.status).toBe(HTTP_STATUS.CREATED)
      const data = await res.json()
      expect(data.data.user.email).toBe(TEST_CREDENTIALS.toto.rawEmail)
    })

    it('should reject empty body', async () => {
      const res = await app.request('/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should not expose refreshToken in response body', async () => {
      const creds = TEST_CREDENTIALS.alice

      const res = await jsonPost(app, '/auth/signup', {
        email: creds.rawEmail,
        password: creds.rawPassword,
      })

      const data = await res.json()
      expect(data.data.refreshToken).toBeUndefined()
    })

    it('should not expose passwordHash in response body', async () => {
      const creds = TEST_CREDENTIALS.toto

      const res = await jsonPost(app, '/auth/signup', {
        email: creds.rawEmail,
        password: creds.rawPassword,
      })

      const data = await res.json()
      expect(data.data.user.passwordHash).toBeUndefined()
      expect(data.data.user.password).toBeUndefined()
    })
  })

  describe('POST /auth/login', () => {
    it('should login existing user and set refresh token cookie', async () => {
      const creds = TEST_CREDENTIALS.toto
      await createTestUser(creds.rawEmail, creds.rawPassword)

      const res = await jsonPost(app, '/auth/login', {
        email: creds.rawEmail,
        password: creds.rawPassword,
      })

      expect(res.status).toBe(HTTP_STATUS.OK)

      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.user.email).toBe(creds.rawEmail)
      expect(data.data.accessToken).toBeDefined()
      expect(data.data.refreshToken).toBeUndefined()

      const cookie = extractCookie(res)
      expect(cookie).toContain('refresh_token=')
      expect(cookie).toContain('HttpOnly')
    })

    it('should reject wrong password', async () => {
      const creds = TEST_CREDENTIALS.toto
      await createTestUser(creds.rawEmail, creds.rawPassword)

      const res = await jsonPost(app, '/auth/login', {
        email: creds.rawEmail,
        password: TEST_CREDENTIALS.invalide.mauvaisMotDePasse,
      })

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('invalid_credentials')
    })

    it('should reject non-existent user', async () => {
      const res = await jsonPost(app, '/auth/login', {
        email: TEST_CREDENTIALS.invalide.emailInconnu,
        password: TEST_CREDENTIALS.toto.rawPassword,
      })

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('invalid_credentials')
    })

    it('should return same error for wrong email and wrong password (timing-safe)', async () => {
      const creds = TEST_CREDENTIALS.toto
      await createTestUser(creds.rawEmail, creds.rawPassword)

      const resBadEmail = await jsonPost(app, '/auth/login', {
        email: TEST_CREDENTIALS.invalide.emailInconnu,
        password: creds.rawPassword,
      })
      const resBadPassword = await jsonPost(app, '/auth/login', {
        email: creds.rawEmail,
        password: TEST_CREDENTIALS.invalide.mauvaisMotDePasse,
      })

      expect(resBadEmail.status).toBe(resBadPassword.status)
      const dataBadEmail = await resBadEmail.json()
      const dataBadPassword = await resBadPassword.json()
      expect(dataBadEmail.error).toBe(dataBadPassword.error)
      expect(dataBadEmail.error).toBe('invalid_credentials')
    })

    it('should reject invalid email format', async () => {
      const res = await jsonPost(app, '/auth/login', {
        email: 'not-an-email',
        password: TEST_CREDENTIALS.toto.rawPassword,
      })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject empty email', async () => {
      const res = await jsonPost(app, '/auth/login', {
        email: '',
        password: TEST_CREDENTIALS.toto.rawPassword,
      })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject empty password', async () => {
      const creds = TEST_CREDENTIALS.toto
      await createTestUser(creds.rawEmail, creds.rawPassword)

      const res = await jsonPost(app, '/auth/login', {
        email: creds.rawEmail,
        password: '',
      })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject empty body', async () => {
      const res = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should normalize email on login', async () => {
      const creds = TEST_CREDENTIALS.toto
      await createTestUser(creds.rawEmail, creds.rawPassword)

      const res = await jsonPost(app, '/auth/login', {
        email: '  TOTO@EXEMPLE.FR  ',
        password: creds.rawPassword,
      })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.data.user.email).toBe(creds.rawEmail)
    })

    it('should not expose passwordHash in response body', async () => {
      const creds = TEST_CREDENTIALS.toto
      await createTestUser(creds.rawEmail, creds.rawPassword)

      const res = await jsonPost(app, '/auth/login', {
        email: creds.rawEmail,
        password: creds.rawPassword,
      })

      const data = await res.json()
      expect(data.data.user.passwordHash).toBeUndefined()
      expect(data.data.user.password).toBeUndefined()
    })

    it('should reject password from another user', async () => {
      const toto = TEST_CREDENTIALS.toto
      const alice = TEST_CREDENTIALS.alice
      await createTestUser(toto.rawEmail, toto.rawPassword)
      await createTestUser(alice.rawEmail, alice.rawPassword)

      const res = await jsonPost(app, '/auth/login', {
        email: toto.rawEmail,
        password: alice.rawPassword,
      })

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
      const data = await res.json()
      expect(data.error).toBe('invalid_credentials')
    })
  })

  describe('POST /auth/refresh', () => {
    it('should rotate tokens with valid refresh cookie', async () => {
      const creds = TEST_CREDENTIALS.toto
      await createTestUser(creds.rawEmail, creds.rawPassword)
      const { cookie: loginCookie } = await loginAndGetCookies(
        app,
        creds.rawEmail,
        creds.rawPassword
      )

      const res = await app.request('/auth/refresh', {
        method: 'POST',
        headers: { Cookie: loginCookie },
      })

      expect(res.status).toBe(HTTP_STATUS.OK)

      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.accessToken).toBeDefined()

      const newCookie = extractCookie(res)
      expect(newCookie).toContain('refresh_token=')
    })

    it('should fail without refresh token', async () => {
      const res = await app.request('/auth/refresh', {
        method: 'POST',
      })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('missing_refresh_token')
    })

    it('should fail with invalid refresh cookie', async () => {
      const res = await app.request('/auth/refresh', {
        method: 'POST',
        headers: { Cookie: 'refresh_token=invalid.token.here' },
      })

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('invalid_token')
    })

    it('should invalidate old refresh token after rotation (replay detection)', async () => {
      const creds = TEST_CREDENTIALS.toto
      await createTestUser(creds.rawEmail, creds.rawPassword)
      const { cookie: loginCookie } = await loginAndGetCookies(
        app,
        creds.rawEmail,
        creds.rawPassword
      )

      const res1 = await app.request('/auth/refresh', {
        method: 'POST',
        headers: { Cookie: loginCookie },
      })
      expect(res1.status).toBe(HTTP_STATUS.OK)

      const res2 = await app.request('/auth/refresh', {
        method: 'POST',
        headers: { Cookie: loginCookie },
      })
      expect(res2.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('should allow multiple successive rotations with fresh cookies', async () => {
      const creds = TEST_CREDENTIALS.toto
      await createTestUser(creds.rawEmail, creds.rawPassword)
      let { cookie: currentCookie } = await loginAndGetCookies(
        app,
        creds.rawEmail,
        creds.rawPassword
      )

      for (let i = 0; i < 3; i++) {
        const res = await app.request('/auth/refresh', {
          method: 'POST',
          headers: { Cookie: currentCookie },
        })
        expect(res.status).toBe(HTTP_STATUS.OK)

        const data = await res.json()
        expect(data.success).toBe(true)
        expect(data.data.accessToken).toBeDefined()

        currentCookie = extractCookie(res)
        expect(currentCookie).toContain('refresh_token=')
      }
    })

    it('should not expose refreshToken in response body', async () => {
      const creds = TEST_CREDENTIALS.toto
      await createTestUser(creds.rawEmail, creds.rawPassword)
      const { cookie } = await loginAndGetCookies(app, creds.rawEmail, creds.rawPassword)

      const res = await app.request('/auth/refresh', {
        method: 'POST',
        headers: { Cookie: cookie },
      })

      const data = await res.json()
      expect(data.data.refreshToken).toBeUndefined()
    })
  })

  describe('POST /auth/logout', () => {
    it('should logout and clear refresh cookie', async () => {
      const creds = TEST_CREDENTIALS.toto
      await createTestUser(creds.rawEmail, creds.rawPassword)
      const { cookie, accessToken } = await loginAndGetCookies(
        app,
        creds.rawEmail,
        creds.rawPassword
      )

      const res = await app.request('/auth/logout', {
        method: 'POST',
        headers: {
          Cookie: cookie,
          Authorization: `Bearer ${accessToken}`,
        },
      })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)

      const setCookie = extractCookie(res)
      expect(setCookie).toContain('refresh_token=;')
    })

    it('should reject logout without access token', async () => {
      const res = await app.request('/auth/logout', {
        method: 'POST',
      })

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('should reject logout with invalid access token', async () => {
      const res = await app.request('/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer invalid.token.here',
        },
      })

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('should invalidate refresh token after logout', async () => {
      const creds = TEST_CREDENTIALS.toto
      await createTestUser(creds.rawEmail, creds.rawPassword)
      const { cookie, accessToken } = await loginAndGetCookies(
        app,
        creds.rawEmail,
        creds.rawPassword
      )

      await app.request('/auth/logout', {
        method: 'POST',
        headers: {
          Cookie: cookie,
          Authorization: `Bearer ${accessToken}`,
        },
      })

      const refreshRes = await app.request('/auth/refresh', {
        method: 'POST',
        headers: { Cookie: cookie },
      })
      expect(refreshRes.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('should allow re-login after logout', async () => {
      const creds = TEST_CREDENTIALS.toto
      await createTestUser(creds.rawEmail, creds.rawPassword)
      const { cookie, accessToken } = await loginAndGetCookies(
        app,
        creds.rawEmail,
        creds.rawPassword
      )

      await app.request('/auth/logout', {
        method: 'POST',
        headers: {
          Cookie: cookie,
          Authorization: `Bearer ${accessToken}`,
        },
      })

      const reloginRes = await jsonPost(app, '/auth/login', {
        email: creds.rawEmail,
        password: creds.rawPassword,
      })

      expect(reloginRes.status).toBe(HTTP_STATUS.OK)
      const data = await reloginRes.json()
      expect(data.success).toBe(true)
      expect(data.data.user.email).toBe(creds.rawEmail)
    })

    it('should not affect other user sessions on logout', async () => {
      const toto = TEST_CREDENTIALS.toto
      const alice = TEST_CREDENTIALS.alice
      await createTestUser(toto.rawEmail, toto.rawPassword)
      await createTestUser(alice.rawEmail, alice.rawPassword)

      const totoSession = await loginAndGetCookies(app, toto.rawEmail, toto.rawPassword)
      const aliceSession = await loginAndGetCookies(app, alice.rawEmail, alice.rawPassword)

      await app.request('/auth/logout', {
        method: 'POST',
        headers: {
          Cookie: totoSession.cookie,
          Authorization: `Bearer ${totoSession.accessToken}`,
        },
      })

      const aliceRefresh = await app.request('/auth/refresh', {
        method: 'POST',
        headers: { Cookie: aliceSession.cookie },
      })
      expect(aliceRefresh.status).toBe(HTTP_STATUS.OK)
    })
  })

  describe('GET /auth/session', () => {
    it('should return authenticated user info', async () => {
      const creds = TEST_CREDENTIALS.toto
      await createTestUser(creds.rawEmail, creds.rawPassword)
      const { accessToken } = await loginAndGetCookies(app, creds.rawEmail, creds.rawPassword)

      const res = await app.request('/auth/session', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.authenticated).toBe(true)
      expect(data.data.userId).toBeDefined()
    })

    it('should reject unauthenticated request', async () => {
      const res = await app.request('/auth/session')

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('should reject request with invalid access token', async () => {
      const res = await app.request('/auth/session', {
        headers: { Authorization: 'Bearer invalid.token.here' },
      })

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('should reject request with expired/revoked access token after logout', async () => {
      const creds = TEST_CREDENTIALS.toto
      await createTestUser(creds.rawEmail, creds.rawPassword)
      const { cookie, accessToken } = await loginAndGetCookies(
        app,
        creds.rawEmail,
        creds.rawPassword
      )

      await app.request('/auth/logout', {
        method: 'POST',
        headers: {
          Cookie: cookie,
          Authorization: `Bearer ${accessToken}`,
        },
      })
    })

    it('should return correct user for each session', async () => {
      const toto = TEST_CREDENTIALS.toto
      const alice = TEST_CREDENTIALS.alice
      await createTestUser(toto.rawEmail, toto.rawPassword)
      await createTestUser(alice.rawEmail, alice.rawPassword)

      const { accessToken: tokenToto } = await loginAndGetCookies(
        app,
        toto.rawEmail,
        toto.rawPassword
      )
      const { accessToken: tokenAlice } = await loginAndGetCookies(
        app,
        alice.rawEmail,
        alice.rawPassword
      )

      const resToto = await app.request('/auth/session', {
        headers: { Authorization: `Bearer ${tokenToto}` },
      })
      const resAlice = await app.request('/auth/session', {
        headers: { Authorization: `Bearer ${tokenAlice}` },
      })

      const dataToto = await resToto.json()
      const dataAlice = await resAlice.json()

      expect(dataToto.data.userId).toBeDefined()
      expect(dataAlice.data.userId).toBeDefined()
      expect(dataToto.data.userId).not.toBe(dataAlice.data.userId)
    })
  })

  describe('POST /auth/verify-email', () => {
    it('should verify a valid token and return ok(null)', async () => {
      const { createVerificationToken } = await import('../email-verification.service')
      const creds = TEST_CREDENTIALS.toto
      const user = await createTestUser(creds.rawEmail, creds.rawPassword)
      const token = await createVerificationToken(testDb, user.id)

      const res = await jsonPost(app, '/auth/verify-email', { token })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data).toBeNull()
    })

    it('should return invalid_token (400) for unknown token', async () => {
      const res = await jsonPost(app, '/auth/verify-email', { token: 'a'.repeat(64) })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('invalid_token')
    })

    it('should return token_expired (400) for expired token', async () => {
      const { createVerificationToken } = await import('../email-verification.service')
      const { emailVerifications } = await import('../../../db/schema')
      const creds = TEST_CREDENTIALS.toto
      const user = await createTestUser(creds.rawEmail, creds.rawPassword)
      const token = await createVerificationToken(testDb, user.id)

      await testDb
        .update(emailVerifications)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(emailVerifications.userId, user.id))

      const res = await jsonPost(app, '/auth/verify-email', { token })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('token_expired')
    })
  })

  describe('POST /auth/resend-verification', () => {
    it('should resend verification email when authenticated and unverified', async () => {
      const creds = TEST_CREDENTIALS.toto
      await createTestUser(creds.rawEmail, creds.rawPassword)
      const { accessToken } = await loginAndGetCookies(app, creds.rawEmail, creds.rawPassword)

      const res = await app.request('/auth/resend-verification', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
    })

    it('should return ok(null) when already verified (idempotent)', async () => {
      const { users: usersTable } = await import('../../../db/schema')
      const creds = TEST_CREDENTIALS.toto
      const user = await createTestUser(creds.rawEmail, creds.rawPassword)
      const { accessToken } = await loginAndGetCookies(app, creds.rawEmail, creds.rawPassword)

      await testDb
        .update(usersTable)
        .set({ emailVerifiedAt: new Date() })
        .where(eq(usersTable.id, user.id))

      const res = await app.request('/auth/resend-verification', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
    })

    it('should return 401 when not authenticated', async () => {
      const res = await app.request('/auth/resend-verification', { method: 'POST' })
      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('should return too_many_requests (429) after 3 requests in the same hour', async () => {
      const creds = TEST_CREDENTIALS.alice
      await createTestUser(creds.rawEmail, creds.rawPassword)
      const { accessToken } = await loginAndGetCookies(app, creds.rawEmail, creds.rawPassword)

      const makeRequest = () =>
        app.request('/auth/resend-verification', {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        })

      await makeRequest()
      await makeRequest()
      await makeRequest()

      const res = await makeRequest()
      expect(res.status).toBe(429)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('too_many_requests')
    })
  })

  describe('POST /auth/login — email_not_verified', () => {
    it('devrait retourner email_not_verified (403) après la grace period', async () => {
      const { users: usersTable } = await import('../../../db/schema')
      const creds = TEST_CREDENTIALS.toto
      const user = await createTestUser(creds.rawEmail, creds.rawPassword)

      await testDb
        .update(usersTable)
        .set({ createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) })
        .where(eq(usersTable.id, user.id))

      const res = await jsonPost(app, '/auth/login', {
        email: creds.rawEmail,
        password: creds.rawPassword,
      })

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('email_not_verified')
    })

    it('devrait autoriser le login pendant la grace period (< 24h)', async () => {
      const creds = TEST_CREDENTIALS.toto
      await createTestUser(creds.rawEmail, creds.rawPassword)

      const res = await jsonPost(app, '/auth/login', {
        email: creds.rawEmail,
        password: creds.rawPassword,
      })

      expect(res.status).toBe(HTTP_STATUS.OK)
    })
  })

  describe('Full auth flow', () => {
    it('should complete signup → login → refresh → session → logout cycle', async () => {
      const creds = TEST_CREDENTIALS.alice

      const signupRes = await jsonPost(app, '/auth/signup', {
        email: creds.rawEmail,
        password: creds.rawPassword,
      })
      expect(signupRes.status).toBe(HTTP_STATUS.CREATED)

      const { cookie, accessToken } = await loginAndGetCookies(
        app,
        creds.rawEmail,
        creds.rawPassword
      )
      expect(accessToken).toBeDefined()

      const refreshRes = await app.request('/auth/refresh', {
        method: 'POST',
        headers: { Cookie: cookie },
      })
      expect(refreshRes.status).toBe(HTTP_STATUS.OK)
      const refreshData = await refreshRes.json()
      const newAccessToken = refreshData.data.accessToken
      const newCookie = extractCookie(refreshRes)

      const sessionRes = await app.request('/auth/session', {
        headers: { Authorization: `Bearer ${newAccessToken}` },
      })
      expect(sessionRes.status).toBe(HTTP_STATUS.OK)
      const sessionData = await sessionRes.json()
      expect(sessionData.data.authenticated).toBe(true)

      const logoutRes = await app.request('/auth/logout', {
        method: 'POST',
        headers: {
          Cookie: newCookie,
          Authorization: `Bearer ${newAccessToken}`,
        },
      })
      expect(logoutRes.status).toBe(HTTP_STATUS.OK)

      const postLogoutRefresh = await app.request('/auth/refresh', {
        method: 'POST',
        headers: { Cookie: newCookie },
      })
      expect(postLogoutRefresh.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })
  })
})
