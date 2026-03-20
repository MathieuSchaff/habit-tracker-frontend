import {
  authSchema as authBodySchema,
  authErrorMapping,
  err,
  errorToStatus,
  HTTP_STATUS,
  isApiSuccess,
  ok,
  refreshTokenBodySchema,
  verifyEmailBodySchema,
} from '@habit-tracker/shared'

import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import type { Context } from 'hono'
import { Hono } from 'hono'

import type { AppEnv } from '../../app-env'
import { users } from '../../db/schema'
import { rateLimiterFunc } from '../../utils/rateLimiter'
import { createVerificationToken, verifyEmailToken } from './email-verification.service'
import { sendVerificationEmail } from './email.service'
import { clearRefreshTokenCookie, extractRefreshToken, setRefreshTokenCookie } from './jwt.utils'
import { requireJwtAuth } from './middleware'
import { type AuthContext, login, logout, refresh, signup } from './service'

function buildAuthContext(c: Context<AppEnv>): AuthContext {
  return {
    db: c.get('db'),
    jwtSecret: c.get('jwtSecret'),
    refreshSecret: c.get('refreshSecret'),
    frontendUrl: c.get('frontendUrl'),
    ip: c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For') ?? 'unknown',
    userAgent: c.req.header('User-Agent') ?? 'unknown',
  }
}

const resendLimiter = new Map<string, { count: number; windowStart: number }>()
const RESEND_MAX = 3
const RESEND_WINDOW_MS = 60 * 60 * 1000

function checkResendLimit(userId: string): boolean {
  const now = Date.now()
  const entry = resendLimiter.get(userId)
  if (!entry || now - entry.windowStart > RESEND_WINDOW_MS) {
    resendLimiter.set(userId, { count: 1, windowStart: now })
    return true
  }
  if (entry.count >= RESEND_MAX) return false
  entry.count++
  return true
}

const app = new Hono<AppEnv>()

app.use('*', rateLimiterFunc)

app.use('/logout', requireJwtAuth)
app.use('/session', requireJwtAuth)
app.use('/mobile/logout', requireJwtAuth)
app.use('/resend-verification', requireJwtAuth)

app.onError((e, c) => {
  console.error('Auth error:', e)
  return c.json(
    err('server_error'),
    HTTP_STATUS.INTERNAL_SERVER_ERROR
  )
})

// Browser

export const jwtAuthRoutes = app

  .post('/login', zValidator('json', authBodySchema), async (c) => {
    const env = c.get('env')
    const ctx = buildAuthContext(c)
    const { email, password } = c.req.valid('json')

    const result = await login(ctx, email, password)

    if (!isApiSuccess(result)) {
      return c.json(err(result.error), errorToStatus(result.error, authErrorMapping))
    }

    setRefreshTokenCookie(c, result.data.refreshToken, env)

    return c.json(
      ok({ user: result.data.user, accessToken: result.data.accessToken }),
      HTTP_STATUS.OK
    )
  })

  .post('/signup', zValidator('json', authBodySchema), async (c) => {
    const env = c.get('env')
    const ctx = buildAuthContext(c)
    const { email, password } = c.req.valid('json')

    const result = await signup(ctx, email, password)

    if (!isApiSuccess(result)) {
      return c.json(err(result.error), errorToStatus(result.error, authErrorMapping))
    }

    setRefreshTokenCookie(c, result.data.refreshToken, env)

    return c.json(
      ok({ user: result.data.user, accessToken: result.data.accessToken }),
      HTTP_STATUS.CREATED
    )
  })

  .post('/refresh', async (c) => {
    const env = c.get('env')
    const ctx = buildAuthContext(c)
    const refreshToken = await extractRefreshToken(c)

    if (!refreshToken) {
      return c.json(err('missing_refresh_token'), HTTP_STATUS.BAD_REQUEST)
    }

    const result = await refresh(ctx, refreshToken)

    if (!isApiSuccess(result)) {
      clearRefreshTokenCookie(c)
      return c.json(err(result.error), errorToStatus(result.error, authErrorMapping))
    }

    setRefreshTokenCookie(c, result.data.refreshToken, env)

    return c.json(
      ok({ user: result.data.user, accessToken: result.data.accessToken }),
      HTTP_STATUS.OK
    )
  })

  .post('/logout', async (c) => {
    const ctx = buildAuthContext(c)
    const refreshToken = await extractRefreshToken(c)

    if (refreshToken) {
      await logout(ctx, refreshToken)
    }

    clearRefreshTokenCookie(c)

    return c.json(ok(null, 'Disconnected'), HTTP_STATUS.OK)
  })

  // Session

  .get('/session', (c) => {
    const userId = c.get('userId')
    return c.json(ok({ authenticated: true as const, userId }), HTTP_STATUS.OK)
  })

  // Email Verification

  .post('/verify-email', zValidator('json', verifyEmailBodySchema), async (c) => {
    const { db } = buildAuthContext(c)
    const { token } = c.req.valid('json')

    const result = await verifyEmailToken(db, token)

    if (!result.success) {
      return c.json(err(result.error), HTTP_STATUS.BAD_REQUEST)
    }

    return c.json(ok(null), HTTP_STATUS.OK)
  })

  .post('/resend-verification', async (c) => {
    const userId = c.get('userId')
    const ctx = buildAuthContext(c)

    if (!checkResendLimit(userId)) {
      return c.json(err('too_many_requests'), HTTP_STATUS.RATE_LIMIT_EXCEEDED)
    }

    const [user] = await ctx.db
      .select({ emailVerifiedAt: users.emailVerifiedAt, email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!user || user.emailVerifiedAt !== null) {
      return c.json(ok(null), HTTP_STATUS.OK)
    }

    const rawToken = await createVerificationToken(ctx.db, userId)
    const verificationUrl = `${ctx.frontendUrl}/verify-email?token=${rawToken}`
    await sendVerificationEmail(user.email, verificationUrl)

    return c.json(ok(null), HTTP_STATUS.OK)
  })

  // Mobile Routes

  .post('/mobile/login', zValidator('json', authBodySchema), async (c) => {
    const ctx = buildAuthContext(c)
    const { email, password } = c.req.valid('json')

    const result = await login(ctx, email, password)

    if (!isApiSuccess(result)) {
      return c.json(err(result.error), errorToStatus(result.error, authErrorMapping))
    }

    return c.json(
      ok({
        user: result.data.user,
        accessToken: result.data.accessToken,
        refreshToken: result.data.refreshToken,
      }),
      HTTP_STATUS.OK
    )
  })

  .post('/mobile/signup', zValidator('json', authBodySchema), async (c) => {
    const ctx = buildAuthContext(c)
    const { email, password } = c.req.valid('json')

    const result = await signup(ctx, email, password)

    if (!isApiSuccess(result)) {
      return c.json(err(result.error), errorToStatus(result.error, authErrorMapping))
    }

    return c.json(
      ok({
        user: result.data.user,
        accessToken: result.data.accessToken,
        refreshToken: result.data.refreshToken,
      }),
      HTTP_STATUS.CREATED
    )
  })

  .post('/mobile/refresh', zValidator('json', refreshTokenBodySchema), async (c) => {
    const ctx = buildAuthContext(c)
    const { refreshToken } = c.req.valid('json')

    if (!refreshToken) {
      return c.json(err('missing_refresh_token'), HTTP_STATUS.BAD_REQUEST)
    }

    const result = await refresh(ctx, refreshToken)

    if (!isApiSuccess(result)) {
      return c.json(err(result.error), errorToStatus(result.error, authErrorMapping))
    }

    return c.json(
      ok({
        accessToken: result.data.accessToken,
        refreshToken: result.data.refreshToken,
      }),
      HTTP_STATUS.OK
    )
  })

  .post('/mobile/logout', zValidator('json', refreshTokenBodySchema), async (c) => {
    const ctx = buildAuthContext(c)
    const { refreshToken } = c.req.valid('json')

    if (refreshToken) {
      await logout(ctx, refreshToken)
    }

    return c.json(ok(null, 'Disconnected'), HTTP_STATUS.OK)
  })
