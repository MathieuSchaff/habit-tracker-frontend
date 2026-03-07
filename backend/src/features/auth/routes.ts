import {
  authSchema as authBodySchema,
  authErrorMapping,
  err,
  errorToStatus,
  HTTP_STATUS,
  isApiSuccess,
  ok,
  refreshTokenBodySchema,
} from '@habit-tracker/shared'

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import type { Context } from 'hono'

import type { AppEnv } from '../../app-env'
import { rateLimiterFunc } from '../../utils/rateLimiter'
import { clearRefreshTokenCookie, extractRefreshToken, setRefreshTokenCookie } from './jwt.utils'
import { requireJwtAuth } from './middleware'
import { type AuthContext, login, logout, refresh, signup } from './service'

function buildAuthContext(c: Context<AppEnv>): AuthContext {
  return {
    db: c.get('db'),
    jwtSecret: c.get('jwtSecret'),
    refreshSecret: c.get('refreshSecret'),
    ip: c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For') ?? 'unknown',
    userAgent: c.req.header('User-Agent') ?? 'unknown',
  }
}

const app = new Hono<AppEnv>()

app.use('*', rateLimiterFunc)

app.use('/logout', requireJwtAuth)
app.use('/session', requireJwtAuth)
app.use('/mobile/logout', requireJwtAuth)

app.onError((e, c) => {
  console.error('Auth error:', e)
  return c.json(
    err('server_error', e instanceof Error ? e.message : undefined),
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
