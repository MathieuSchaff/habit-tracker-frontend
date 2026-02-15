import {
  authErrorMapping,
  authSchema,
  err,
  errorToStatus,
  HTTP_STATUS,
  isApiSuccess,
  ok,
} from '@habit-tracker/shared'

import { zValidator } from '@hono/zod-validator'
import { type Context, Hono } from 'hono'

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

//  Routes

export const jwtAuthRoutes = new Hono<AppEnv>()

  .post('/login', rateLimiterFunc, zValidator('json', authSchema), async (c) => {
    const env = c.get('env')
    const ctx = buildAuthContext(c)
    const { email, password } = c.req.valid('json')

    const result = await login(ctx, email, password)

    if (!isApiSuccess(result)) {
      return c.json(err(result.error), errorToStatus(result.error, authErrorMapping))
    }

    setRefreshTokenCookie(c, result.data.refreshToken, env)

    // Le refreshToken n'est PAS renvoyé dans le body → httpOnly cookie uniquement
    return c.json(
      ok({
        user: result.data.user,
        accessToken: result.data.accessToken,
      }),
      HTTP_STATUS.OK
    )
  })

  .post('/refresh', rateLimiterFunc, async (c) => {
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

    // Rotation du cookie
    setRefreshTokenCookie(c, result.data.refreshToken, env)

    return c.json(
      ok({
        user: result.data.user,
        accessToken: result.data.accessToken,
      }),
      HTTP_STATUS.OK
    )
  })

  .post('/logout', rateLimiterFunc, requireJwtAuth, async (c) => {
    const ctx = buildAuthContext(c)

    const refreshToken = await extractRefreshToken(c)

    if (refreshToken) {
      await logout(ctx, refreshToken)
    }

    clearRefreshTokenCookie(c)

    return c.json(ok(null, 'Disconnected'), HTTP_STATUS.OK)
  })

  //  MOBILE (body-based, pas de cookies)

  .post('/mobile/login', rateLimiterFunc, zValidator('json', authSchema), async (c) => {
    const ctx = buildAuthContext(c)
    const { email, password } = c.req.valid('json')

    const result = await login(ctx, email, password)

    if (!isApiSuccess(result)) {
      return c.json(err(result.error), errorToStatus(result.error, authErrorMapping))
    }

    // Pas de cookie → refreshToken dans le body pour Secure Storage
    return c.json(
      ok({
        user: result.data.user,
        accessToken: result.data.accessToken,
        refreshToken: result.data.refreshToken,
      }),
      HTTP_STATUS.OK
    )
  })

  .post('/mobile/refresh', rateLimiterFunc, async (c) => {
    const ctx = buildAuthContext(c)

    // Le mobile envoie le refreshToken dans le body
    const body = await c.req.json<{ refreshToken?: string }>()
    const refreshToken = body.refreshToken

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

  .post('/mobile/logout', rateLimiterFunc, requireJwtAuth, async (c) => {
    const ctx = buildAuthContext(c)

    const body = await c.req.json<{ refreshToken?: string }>()
    const refreshToken = body.refreshToken

    if (refreshToken) {
      await logout(ctx, refreshToken)
    }

    return c.json(ok(null, 'Disconnected'), HTTP_STATUS.OK)
  })

  // SESSION CHECK (commun)

  .get('/session', requireJwtAuth, (c) => {
    const userId = c.get('userId')
    return c.json(ok({ authenticated: true, userId }), HTTP_STATUS.OK)
  })
  //  BROWSER (cookie-based)

  .post('/signup', rateLimiterFunc, zValidator('json', authSchema), async (c) => {
    const env = c.get('env')
    const ctx = buildAuthContext(c)
    const { email, password } = c.req.valid('json')

    const result = await signup(ctx, email, password)

    if (!isApiSuccess(result)) {
      return c.json(err(result.error), errorToStatus(result.error, authErrorMapping))
    }

    setRefreshTokenCookie(c, result.data.refreshToken, env)

    return c.json(
      ok({
        user: result.data.user,
        accessToken: result.data.accessToken,
      }),
      HTTP_STATUS.CREATED
    )
  })

  // MOBILE (body-based, pas de cookies)

  .post('/mobile/signup', rateLimiterFunc, zValidator('json', authSchema), async (c) => {
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
