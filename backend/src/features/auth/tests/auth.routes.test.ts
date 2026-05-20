import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@habit-tracker/shared'

import { eq } from 'drizzle-orm'

import { testDb } from '../../../tests/db.test.config'
import { createTestClient, type TestClient, withAuth } from '../../../tests/helpers/createTestClient'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'
import { createTestUser } from '../../../tests/helpers/test-factories'

function extractCookie(res: { headers: Headers }): string {
  return res.headers.get('Set-Cookie') ?? ''
}

async function loginAndGetCookies(client: TestClient, email: string, password: string) {
  const res = await client.auth.login.$post({ json: { email, password } })
  const data = await res.json()
  const cookie = extractCookie(res)
  const accessToken = data.success ? data.data.accessToken : ''
  return { res, data, cookie, accessToken }
}

describe('Auth Routes (browser)', () => {
  let client: TestClient

  beforeEach(async () => {
    client = await createTestClient()
  })

  describe('POST /auth/signup', () => {
    it('should create a new user and set refresh token cookie', async () => {
      const creds = TEST_CREDENTIALS.toto

      const res = await client.auth.signup.$post({
        json: { email: creds.rawEmail, password: creds.rawPassword },
      })

      expect(res.status).toBe(HTTP_STATUS.CREATED)

      const data = await res.json()
      expect(data.success).toBe(true)
      if (!data.success) throw new Error('signup failed')
      expect(data.data.user.email).toBe(creds.rawEmail)
      expect(data.data.accessToken).toBeDefined()

      // Mobile-only `refreshToken` field is absent on browser endpoint.
      expect((data.data as { refreshToken?: string }).refreshToken).toBeUndefined()

      const cookie = extractCookie(res)
      expect(cookie).toContain('refresh_token=')
      expect(cookie).toContain('HttpOnly')
    })

    it('should signup Alice successfully', async () => {
      const creds = TEST_CREDENTIALS.alice

      const res = await client.auth.signup.$post({
        json: { email: creds.rawEmail, password: creds.rawPassword },
      })

      expect(res.status).toBe(HTTP_STATUS.CREATED)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (!data.success) throw new Error('signup failed')
      expect(data.data.user.email).toBe(creds.rawEmail)
    })

    it('should signup Jean-Michel (hyphenated email)', async () => {
      const creds = TEST_CREDENTIALS.jeanmichel

      const res = await client.auth.signup.$post({
        json: { email: creds.rawEmail, password: creds.rawPassword },
      })

      expect(res.status).toBe(HTTP_STATUS.CREATED)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (!data.success) throw new Error('signup failed')
      expect(data.data.user.email).toBe(creds.rawEmail)
    })

    it('should reject invalid email format', async () => {
      const res = await client.auth.signup.$post({
        json: { email: 'invalid-email', password: TEST_CREDENTIALS.toto.rawPassword },
      })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
      const data = await res.json()
      expect(data.success).toBe(false)
    })

    it('should reject empty email', async () => {
      const res = await client.auth.signup.$post({
        json: { email: '', password: TEST_CREDENTIALS.toto.rawPassword },
      })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
      const data = await res.json()
      expect(data.success).toBe(false)
    })

    it('should reject too short password', async () => {
      const res = await client.auth.signup.$post({
        json: {
          email: TEST_CREDENTIALS.toto.rawEmail,
          password: TEST_CREDENTIALS.invalide.motDePasseTropCourt,
        },
      })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
      const data = await res.json()
      expect(data.success).toBe(false)
    })

    it('should reject weak password (no uppercase)', async () => {
      const res = await client.auth.signup.$post({
        json: {
          email: TEST_CREDENTIALS.toto.rawEmail,
          password: TEST_CREDENTIALS.invalide.sansMajuscule,
        },
      })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
      const data = await res.json()
      expect(data.success).toBe(false)
    })

    it('should reject weak password (no digit)', async () => {
      const res = await client.auth.signup.$post({
        json: {
          email: TEST_CREDENTIALS.toto.rawEmail,
          password: TEST_CREDENTIALS.invalide.sansChiffre,
        },
      })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
      const data = await res.json()
      expect(data.success).toBe(false)
    })

    it('should reject weak password (no special char)', async () => {
      const res = await client.auth.signup.$post({
        json: {
          email: TEST_CREDENTIALS.toto.rawEmail,
          password: TEST_CREDENTIALS.invalide.sansCaractereSpecial,
        },
      })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
      const data = await res.json()
      expect(data.success).toBe(false)
    })

    it('should reject empty password', async () => {
      const res = await client.auth.signup.$post({
        json: { email: TEST_CREDENTIALS.toto.rawEmail, password: '' },
      })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
      const data = await res.json()
      expect(data.success).toBe(false)
    })

    it('should reject duplicate email', async () => {
      const creds = TEST_CREDENTIALS.toto
      await createTestUser(creds.rawEmail, creds.rawPassword)

      const res = await client.auth.signup.$post({
        json: { email: creds.rawEmail, password: creds.rawPassword },
      })

      expect(res.status).toBe(HTTP_STATUS.CONFLICT)
      const data = await res.json()
      expect(data.success).toBe(false)
      if (!data.success) expect(data.error).toBe('email_exists')
    })

    it('should reject duplicate email with different casing', async () => {
      const creds = TEST_CREDENTIALS.toto
      await createTestUser(creds.rawEmail, creds.rawPassword)

      const res = await client.auth.signup.$post({
        json: { email: 'TOTO@EXEMPLE.FR', password: creds.rawPassword },
      })

      expect(res.status).toBe(HTTP_STATUS.CONFLICT)
      const data = await res.json()
      expect(data.success).toBe(false)
      if (!data.success) expect(data.error).toBe('email_exists')
    })

    it('should normalize email on signup', async () => {
      const res = await client.auth.signup.$post({
        json: { email: '  TOTO@EXEMPLE.FR  ', password: TEST_CREDENTIALS.toto.rawPassword },
      })

      expect(res.status).toBe(HTTP_STATUS.CREATED)
      const data = await res.json()
      if (!data.success) throw new Error('signup failed')
      expect(data.data.user.email).toBe(TEST_CREDENTIALS.toto.rawEmail)
    })

    it('should reject empty body', async () => {
      // Intentional contract violation: signup expects {email, password}; we
      // verify the validator rejects an empty body with 400.
      const res = await client.auth.signup.$post({
        // @ts-expect-error — exercising the validator with an empty body
        json: {},
      })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should not expose refreshToken in response body', async () => {
      const creds = TEST_CREDENTIALS.alice

      const res = await client.auth.signup.$post({
        json: { email: creds.rawEmail, password: creds.rawPassword },
      })

      const data = await res.json()
      if (!data.success) throw new Error('signup failed')
      expect((data.data as { refreshToken?: string }).refreshToken).toBeUndefined()
    })

    it('should not expose passwordHash in response body', async () => {
      const creds = TEST_CREDENTIALS.toto

      const res = await client.auth.signup.$post({
        json: { email: creds.rawEmail, password: creds.rawPassword },
      })

      const data = await res.json()
      if (!data.success) throw new Error('signup failed')
      expect((data.data.user as { passwordHash?: string }).passwordHash).toBeUndefined()
      expect((data.data.user as { password?: string }).password).toBeUndefined()
    })
  })

  describe('POST /auth/login', () => {
    it('should login existing user and set refresh token cookie', async () => {
      const creds = TEST_CREDENTIALS.toto
      await createTestUser(creds.rawEmail, creds.rawPassword)

      const res = await client.auth.login.$post({
        json: { email: creds.rawEmail, password: creds.rawPassword },
      })

      expect(res.status).toBe(HTTP_STATUS.OK)

      const data = await res.json()
      expect(data.success).toBe(true)
      if (!data.success) throw new Error('login failed')
      expect(data.data.user.email).toBe(creds.rawEmail)
      expect(data.data.accessToken).toBeDefined()
      expect((data.data as { refreshToken?: string }).refreshToken).toBeUndefined()

      const cookie = extractCookie(res)
      expect(cookie).toContain('refresh_token=')
      expect(cookie).toContain('HttpOnly')
    })

    it('should reject wrong password', async () => {
      const creds = TEST_CREDENTIALS.toto
      await createTestUser(creds.rawEmail, creds.rawPassword)

      const res = await client.auth.login.$post({
        json: {
          email: creds.rawEmail,
          password: TEST_CREDENTIALS.invalide.mauvaisMotDePasse,
        },
      })

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
      const data = await res.json()
      expect(data.success).toBe(false)
      if (!data.success) expect(data.error).toBe('invalid_credentials')
    })

    it('should reject non-existent user', async () => {
      const res = await client.auth.login.$post({
        json: {
          email: TEST_CREDENTIALS.invalide.emailInconnu,
          password: TEST_CREDENTIALS.toto.rawPassword,
        },
      })

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
      const data = await res.json()
      expect(data.success).toBe(false)
      if (!data.success) expect(data.error).toBe('invalid_credentials')
    })

    it('should return same error for wrong email and wrong password (timing-safe)', async () => {
      const creds = TEST_CREDENTIALS.toto
      await createTestUser(creds.rawEmail, creds.rawPassword)

      const resBadEmail = await client.auth.login.$post({
        json: {
          email: TEST_CREDENTIALS.invalide.emailInconnu,
          password: creds.rawPassword,
        },
      })
      const resBadPassword = await client.auth.login.$post({
        json: {
          email: creds.rawEmail,
          password: TEST_CREDENTIALS.invalide.mauvaisMotDePasse,
        },
      })

      expect(resBadEmail.status).toBe(resBadPassword.status)
      const dataBadEmail = await resBadEmail.json()
      const dataBadPassword = await resBadPassword.json()
      if (dataBadEmail.success || dataBadPassword.success) {
        throw new Error('expected both bad-credential logins to fail')
      }
      expect(dataBadEmail.error).toBe(dataBadPassword.error)
      expect(dataBadEmail.error).toBe('invalid_credentials')
    })

    it('should reject invalid email format', async () => {
      const res = await client.auth.login.$post({
        json: { email: 'not-an-email', password: TEST_CREDENTIALS.toto.rawPassword },
      })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject empty email', async () => {
      const res = await client.auth.login.$post({
        json: { email: '', password: TEST_CREDENTIALS.toto.rawPassword },
      })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject empty password', async () => {
      const creds = TEST_CREDENTIALS.toto
      await createTestUser(creds.rawEmail, creds.rawPassword)

      const res = await client.auth.login.$post({
        json: { email: creds.rawEmail, password: '' },
      })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject empty body', async () => {
      const res = await client.auth.login.$post({
        // @ts-expect-error — exercising the validator with an empty body
        json: {},
      })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should normalize email on login', async () => {
      const creds = TEST_CREDENTIALS.toto
      await createTestUser(creds.rawEmail, creds.rawPassword)

      const res = await client.auth.login.$post({
        json: { email: '  TOTO@EXEMPLE.FR  ', password: creds.rawPassword },
      })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      if (!data.success) throw new Error('login failed')
      expect(data.data.user.email).toBe(creds.rawEmail)
    })

    it('should not expose passwordHash in response body', async () => {
      const creds = TEST_CREDENTIALS.toto
      await createTestUser(creds.rawEmail, creds.rawPassword)

      const res = await client.auth.login.$post({
        json: { email: creds.rawEmail, password: creds.rawPassword },
      })

      const data = await res.json()
      if (!data.success) throw new Error('login failed')
      expect((data.data.user as { passwordHash?: string }).passwordHash).toBeUndefined()
      expect((data.data.user as { password?: string }).password).toBeUndefined()
    })

    it('should reject password from another user', async () => {
      const toto = TEST_CREDENTIALS.toto
      const alice = TEST_CREDENTIALS.alice
      await createTestUser(toto.rawEmail, toto.rawPassword)
      await createTestUser(alice.rawEmail, alice.rawPassword)

      const res = await client.auth.login.$post({
        json: { email: toto.rawEmail, password: alice.rawPassword },
      })

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
      const data = await res.json()
      if (!data.success) expect(data.error).toBe('invalid_credentials')
    })
  })

  describe('POST /auth/refresh', () => {
    it('should rotate tokens with valid refresh cookie', async () => {
      const creds = TEST_CREDENTIALS.toto
      await createTestUser(creds.rawEmail, creds.rawPassword)
      const { cookie: loginCookie } = await loginAndGetCookies(
        client,
        creds.rawEmail,
        creds.rawPassword
      )

      const res = await client.auth.refresh.$post(
        {},
        { headers: { Cookie: loginCookie } },
      )

      expect(res.status).toBe(HTTP_STATUS.OK)

      const data = await res.json()
      expect(data.success).toBe(true)
      if (!data.success) throw new Error('refresh failed')
      expect(data.data.accessToken).toBeDefined()

      const newCookie = extractCookie(res)
      expect(newCookie).toContain('refresh_token=')
    })

    it('should fail without refresh token', async () => {
      const res = await client.auth.refresh.$post({})

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
      const data = await res.json()
      expect(data.success).toBe(false)
      if (!data.success) expect(data.error).toBe('missing_refresh_token')
    })

    it('should fail with invalid refresh cookie', async () => {
      const res = await client.auth.refresh.$post(
        {},
        { headers: { Cookie: 'refresh_token=invalid.token.here' } },
      )

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
      const data = await res.json()
      expect(data.success).toBe(false)
      if (!data.success) expect(data.error).toBe('invalid_token')
    })

    it('should invalidate old refresh token after rotation (replay detection)', async () => {
      const creds = TEST_CREDENTIALS.toto
      await createTestUser(creds.rawEmail, creds.rawPassword)
      const { cookie: loginCookie } = await loginAndGetCookies(
        client,
        creds.rawEmail,
        creds.rawPassword
      )

      const res1 = await client.auth.refresh.$post(
        {},
        { headers: { Cookie: loginCookie } },
      )
      expect(res1.status).toBe(HTTP_STATUS.OK)

      const res2 = await client.auth.refresh.$post(
        {},
        { headers: { Cookie: loginCookie } },
      )
      expect(res2.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('should allow multiple successive rotations with fresh cookies', async () => {
      const creds = TEST_CREDENTIALS.toto
      await createTestUser(creds.rawEmail, creds.rawPassword)
      let { cookie: currentCookie } = await loginAndGetCookies(
        client,
        creds.rawEmail,
        creds.rawPassword
      )

      for (let i = 0; i < 3; i++) {
        const res = await client.auth.refresh.$post(
          {},
          { headers: { Cookie: currentCookie } },
        )
        expect(res.status).toBe(HTTP_STATUS.OK)

        const data = await res.json()
        expect(data.success).toBe(true)
        if (!data.success) throw new Error('refresh failed')
        expect(data.data.accessToken).toBeDefined()

        currentCookie = extractCookie(res)
        expect(currentCookie).toContain('refresh_token=')
      }
    })

    it('should not expose refreshToken in response body', async () => {
      const creds = TEST_CREDENTIALS.toto
      await createTestUser(creds.rawEmail, creds.rawPassword)
      const { cookie } = await loginAndGetCookies(client, creds.rawEmail, creds.rawPassword)

      const res = await client.auth.refresh.$post(
        {},
        { headers: { Cookie: cookie } },
      )

      const data = await res.json()
      if (!data.success) throw new Error('refresh failed')
      expect((data.data as { refreshToken?: string }).refreshToken).toBeUndefined()
    })
  })

  describe('POST /auth/logout', () => {
    it('should logout and clear refresh cookie', async () => {
      const creds = TEST_CREDENTIALS.toto
      await createTestUser(creds.rawEmail, creds.rawPassword)
      const { cookie, accessToken } = await loginAndGetCookies(
        client,
        creds.rawEmail,
        creds.rawPassword
      )

      const res = await client.auth.logout.$post(
        {},
        {
          headers: {
            Cookie: cookie,
            Authorization: `Bearer ${accessToken}`,
          },
        },
      )

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)

      const setCookie = extractCookie(res)
      expect(setCookie).toContain('refresh_token=;')
    })

    it('should reject logout without access token', async () => {
      const res = await client.auth.logout.$post({})

      // Middleware-issued 401 is outside the route's inferred status union.
      expect(res.status as number).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('should reject logout with invalid access token', async () => {
      const res = await client.auth.logout.$post(
        {},
        { headers: { Authorization: 'Bearer invalid.token.here' } },
      )

      expect(res.status as number).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('should invalidate refresh token after logout', async () => {
      const creds = TEST_CREDENTIALS.toto
      await createTestUser(creds.rawEmail, creds.rawPassword)
      const { cookie, accessToken } = await loginAndGetCookies(
        client,
        creds.rawEmail,
        creds.rawPassword
      )

      await client.auth.logout.$post(
        {},
        {
          headers: {
            Cookie: cookie,
            Authorization: `Bearer ${accessToken}`,
          },
        },
      )

      const refreshRes = await client.auth.refresh.$post(
        {},
        { headers: { Cookie: cookie } },
      )
      expect(refreshRes.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('should allow re-login after logout', async () => {
      const creds = TEST_CREDENTIALS.toto
      await createTestUser(creds.rawEmail, creds.rawPassword)
      const { cookie, accessToken } = await loginAndGetCookies(
        client,
        creds.rawEmail,
        creds.rawPassword
      )

      await client.auth.logout.$post(
        {},
        {
          headers: {
            Cookie: cookie,
            Authorization: `Bearer ${accessToken}`,
          },
        },
      )

      const reloginRes = await client.auth.login.$post({
        json: { email: creds.rawEmail, password: creds.rawPassword },
      })

      expect(reloginRes.status).toBe(HTTP_STATUS.OK)
      const data = await reloginRes.json()
      expect(data.success).toBe(true)
      if (!data.success) throw new Error('relogin failed')
      expect(data.data.user.email).toBe(creds.rawEmail)
    })

    it('should not affect other user sessions on logout', async () => {
      const toto = TEST_CREDENTIALS.toto
      const alice = TEST_CREDENTIALS.alice
      await createTestUser(toto.rawEmail, toto.rawPassword)
      await createTestUser(alice.rawEmail, alice.rawPassword)

      const totoSession = await loginAndGetCookies(client, toto.rawEmail, toto.rawPassword)
      const aliceSession = await loginAndGetCookies(client, alice.rawEmail, alice.rawPassword)

      await client.auth.logout.$post(
        {},
        {
          headers: {
            Cookie: totoSession.cookie,
            Authorization: `Bearer ${totoSession.accessToken}`,
          },
        },
      )

      const aliceRefresh = await client.auth.refresh.$post(
        {},
        { headers: { Cookie: aliceSession.cookie } },
      )
      expect(aliceRefresh.status).toBe(HTTP_STATUS.OK)
    })
  })

  describe('GET /auth/session', () => {
    it('should return authenticated user info', async () => {
      const creds = TEST_CREDENTIALS.toto
      await createTestUser(creds.rawEmail, creds.rawPassword)
      const { accessToken } = await loginAndGetCookies(client, creds.rawEmail, creds.rawPassword)

      const res = await client.auth.session.$get({}, withAuth(accessToken))

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (!data.success) throw new Error('session failed')
      expect(data.data.authenticated).toBe(true)
      expect(data.data.userId).toBeDefined()
    })

    it('should reject unauthenticated request', async () => {
      const res = await client.auth.session.$get()

      // Middleware-issued 401 is outside the route's inferred status union.
      expect(res.status as number).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('should reject request with invalid access token', async () => {
      const res = await client.auth.session.$get(
        {},
        { headers: { Authorization: 'Bearer invalid.token.here' } },
      )

      expect(res.status as number).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('should reject request with expired/revoked access token after logout', async () => {
      const creds = TEST_CREDENTIALS.toto
      await createTestUser(creds.rawEmail, creds.rawPassword)
      const { cookie, accessToken } = await loginAndGetCookies(
        client,
        creds.rawEmail,
        creds.rawPassword
      )

      await client.auth.logout.$post(
        {},
        {
          headers: {
            Cookie: cookie,
            Authorization: `Bearer ${accessToken}`,
          },
        },
      )
    })

    it('should return correct user for each session', async () => {
      const toto = TEST_CREDENTIALS.toto
      const alice = TEST_CREDENTIALS.alice
      await createTestUser(toto.rawEmail, toto.rawPassword)
      await createTestUser(alice.rawEmail, alice.rawPassword)

      const { accessToken: tokenToto } = await loginAndGetCookies(
        client,
        toto.rawEmail,
        toto.rawPassword
      )
      const { accessToken: tokenAlice } = await loginAndGetCookies(
        client,
        alice.rawEmail,
        alice.rawPassword
      )

      const resToto = await client.auth.session.$get({}, withAuth(tokenToto))
      const resAlice = await client.auth.session.$get({}, withAuth(tokenAlice))

      const dataToto = await resToto.json()
      const dataAlice = await resAlice.json()

      if (!dataToto.success || !dataAlice.success) {
        throw new Error('expected both sessions to succeed')
      }
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

      const res = await client.auth['verify-email'].$post({ json: { token } })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (!data.success) throw new Error('verify-email failed')
      expect(data.data).toBeNull()
    })

    it('should return invalid_token (400) for unknown token', async () => {
      const res = await client.auth['verify-email'].$post({
        json: { token: 'a'.repeat(64) },
      })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
      const data = await res.json()
      expect(data.success).toBe(false)
      if (!data.success) expect(data.error).toBe('invalid_token')
    })

    it('should return token_expired (400) for expired token', async () => {
      const { createVerificationToken } = await import('../email-verification.service')
      const { emailVerifications } = await import('../../../db/schema')
      const creds = TEST_CREDENTIALS.toto
      const user = await createTestUser(creds.rawEmail, creds.rawPassword)
      const token = await createVerificationToken(testDb, user.id)

      await testDb
        .update(emailVerifications)
        .set({ expiresAt: new Date(Date.now() - 1000).toISOString() })
        .where(eq(emailVerifications.userId, user.id))

      const res = await client.auth['verify-email'].$post({ json: { token } })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
      const data = await res.json()
      expect(data.success).toBe(false)
      if (!data.success) expect(data.error).toBe('token_expired')
    })
  })

  describe('POST /auth/resend-verification', () => {
    it('should resend verification email when authenticated and unverified', async () => {
      const creds = TEST_CREDENTIALS.toto
      await createTestUser(creds.rawEmail, creds.rawPassword)
      const { accessToken } = await loginAndGetCookies(client, creds.rawEmail, creds.rawPassword)

      const res = await client.auth['resend-verification'].$post({}, withAuth(accessToken))

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
    })

    it('should return ok(null) when already verified (idempotent)', async () => {
      const { users: usersTable } = await import('../../../db/schema')
      const creds = TEST_CREDENTIALS.toto
      const user = await createTestUser(creds.rawEmail, creds.rawPassword)
      const { accessToken } = await loginAndGetCookies(client, creds.rawEmail, creds.rawPassword)

      await testDb
        .update(usersTable)
        .set({ emailVerifiedAt: new Date().toISOString() })
        .where(eq(usersTable.id, user.id))

      const res = await client.auth['resend-verification'].$post({}, withAuth(accessToken))

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
    })

    it('should return 401 when not authenticated', async () => {
      const res = await client.auth['resend-verification'].$post({})
      // Middleware-issued 401 is outside the route's inferred status union.
      expect(res.status as number).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('should return too_many_requests (429) after 3 requests in the same hour', async () => {
      const creds = TEST_CREDENTIALS.alice
      await createTestUser(creds.rawEmail, creds.rawPassword)
      const { accessToken } = await loginAndGetCookies(client, creds.rawEmail, creds.rawPassword)

      const makeRequest = () =>
        client.auth['resend-verification'].$post({}, withAuth(accessToken))

      await makeRequest()
      await makeRequest()
      await makeRequest()

      const res = await makeRequest()
      expect(res.status).toBe(429)
      const data = await res.json()
      expect(data.success).toBe(false)
      if (!data.success) expect(data.error).toBe('too_many_requests')
    })
  })

  describe('POST /auth/login — email_not_verified', () => {
    it('devrait retourner email_not_verified (403) après la grace period', async () => {
      const { users: usersTable } = await import('../../../db/schema')
      const creds = TEST_CREDENTIALS.toto
      const user = await createTestUser(creds.rawEmail, creds.rawPassword)

      await testDb
        .update(usersTable)
        .set({ createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() })
        .where(eq(usersTable.id, user.id))

      const res = await client.auth.login.$post({
        json: { email: creds.rawEmail, password: creds.rawPassword },
      })

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN)
      const data = await res.json()
      expect(data.success).toBe(false)
      if (!data.success) expect(data.error).toBe('email_not_verified')
    })

    it('devrait autoriser le login pendant la grace period (< 24h)', async () => {
      const creds = TEST_CREDENTIALS.toto
      await createTestUser(creds.rawEmail, creds.rawPassword)

      const res = await client.auth.login.$post({
        json: { email: creds.rawEmail, password: creds.rawPassword },
      })

      expect(res.status).toBe(HTTP_STATUS.OK)
    })
  })

  describe('Full auth flow', () => {
    it('should complete signup → login → refresh → session → logout cycle', async () => {
      const creds = TEST_CREDENTIALS.alice

      const signupRes = await client.auth.signup.$post({
        json: { email: creds.rawEmail, password: creds.rawPassword },
      })
      expect(signupRes.status).toBe(HTTP_STATUS.CREATED)

      const { cookie, accessToken } = await loginAndGetCookies(
        client,
        creds.rawEmail,
        creds.rawPassword
      )
      expect(accessToken).toBeDefined()

      const refreshRes = await client.auth.refresh.$post(
        {},
        { headers: { Cookie: cookie } },
      )
      expect(refreshRes.status).toBe(HTTP_STATUS.OK)
      const refreshData = await refreshRes.json()
      if (!refreshData.success) throw new Error('refresh failed')
      const newAccessToken = refreshData.data.accessToken
      const newCookie = extractCookie(refreshRes)

      const sessionRes = await client.auth.session.$get({}, withAuth(newAccessToken))
      expect(sessionRes.status).toBe(HTTP_STATUS.OK)
      const sessionData = await sessionRes.json()
      if (!sessionData.success) throw new Error('session failed')
      expect(sessionData.data.authenticated).toBe(true)

      const logoutRes = await client.auth.logout.$post(
        {},
        {
          headers: {
            Cookie: newCookie,
            Authorization: `Bearer ${newAccessToken}`,
          },
        },
      )
      expect(logoutRes.status).toBe(HTTP_STATUS.OK)

      const postLogoutRefresh = await client.auth.refresh.$post(
        {},
        { headers: { Cookie: newCookie } },
      )
      expect(postLogoutRefresh.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })
  })
})
