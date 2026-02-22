import {
  authSchema as authBodySchema,
  authErrorMapping,
  browserAuthResultSchema,
  err,
  errorResponse,
  errorToStatus,
  HTTP_STATUS,
  isApiSuccess,
  mobileAuthResultSchema,
  mobileRefreshResultSchema,
  ok,
  refreshTokenBodySchema,
  sessionResultSchema,
  successResponse,
} from '@habit-tracker/shared'

import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
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

const authBodyJsonContent = {
  content: {
    'application/json': {
      schema: authBodySchema,
    },
  },
}

const nullDataSchema = z.null()

// BROWSER

const loginRoute = createRoute({
  method: 'post',
  path: '/login',
  tags: ['Auth - Browser'],
  summary: 'Login (browser, cookie-based refresh)',
  request: { body: authBodyJsonContent },
  responses: {
    [HTTP_STATUS.OK]: successResponse(browserAuthResultSchema, 'Login successful'),
    [HTTP_STATUS.UNAUTHORIZED]: errorResponse('Invalid credentials'),
    [HTTP_STATUS.BAD_REQUEST]: errorResponse('Validation error'),
    [HTTP_STATUS.RATE_LIMIT_EXCEEDED]: errorResponse('Rate limit exceeded'),
  },
})

const signupRoute = createRoute({
  method: 'post',
  path: '/signup',
  tags: ['Auth - Browser'],
  summary: 'Signup (browser, cookie-based refresh)',
  request: { body: authBodyJsonContent },
  responses: {
    [HTTP_STATUS.CREATED]: successResponse(browserAuthResultSchema, 'Signup successful'),
    [HTTP_STATUS.CONFLICT]: errorResponse('Email already exists'),
    [HTTP_STATUS.BAD_REQUEST]: errorResponse('Validation error'),
    [HTTP_STATUS.RATE_LIMIT_EXCEEDED]: errorResponse('Rate limit exceeded'),
  },
})

const browserRefreshRoute = createRoute({
  method: 'post',
  path: '/refresh',
  tags: ['Auth - Browser'],
  summary: 'Refresh access token (cookie-based)',
  responses: {
    [HTTP_STATUS.OK]: successResponse(browserAuthResultSchema, 'Token refreshed'),
    [HTTP_STATUS.BAD_REQUEST]: errorResponse('Missing refresh token'),
    [HTTP_STATUS.UNAUTHORIZED]: errorResponse('Invalid or expired token'),
    [HTTP_STATUS.RATE_LIMIT_EXCEEDED]: errorResponse('Rate limit exceeded'),
  },
})

const logoutRoute = createRoute({
  method: 'post',
  path: '/logout',
  tags: ['Auth - Browser'],
  summary: 'Logout (browser)',
  security: [{ Bearer: [] }],
  responses: {
    [HTTP_STATUS.OK]: successResponse(nullDataSchema, 'Logged out'),
    [HTTP_STATUS.UNAUTHORIZED]: errorResponse('Not authenticated'),
    [HTTP_STATUS.RATE_LIMIT_EXCEEDED]: errorResponse('Rate limit exceeded'),
  },
})

// SESSION

const sessionRoute = createRoute({
  method: 'get',
  path: '/session',
  tags: ['Auth'],
  summary: 'Check current session',
  security: [{ Bearer: [] }],
  responses: {
    [HTTP_STATUS.OK]: successResponse(sessionResultSchema, 'Authenticated'),
    [HTTP_STATUS.UNAUTHORIZED]: errorResponse('Not authenticated'),
  },
})

// MOBILE

const mobileLoginRoute = createRoute({
  method: 'post',
  path: '/mobile/login',
  tags: ['Auth - Mobile'],
  summary: 'Login (mobile, body-based refresh)',
  request: { body: authBodyJsonContent },
  responses: {
    [HTTP_STATUS.OK]: successResponse(mobileAuthResultSchema, 'Login successful'),
    [HTTP_STATUS.UNAUTHORIZED]: errorResponse('Invalid credentials'),
    [HTTP_STATUS.BAD_REQUEST]: errorResponse('Validation error'),
    [HTTP_STATUS.RATE_LIMIT_EXCEEDED]: errorResponse('Rate limit exceeded'),
  },
})

const mobileSignupRoute = createRoute({
  method: 'post',
  path: '/mobile/signup',
  tags: ['Auth - Mobile'],
  summary: 'Signup (mobile, body-based refresh)',
  request: { body: authBodyJsonContent },
  responses: {
    [HTTP_STATUS.CREATED]: successResponse(mobileAuthResultSchema, 'Signup successful'),
    [HTTP_STATUS.CONFLICT]: errorResponse('Email already exists'),
    [HTTP_STATUS.BAD_REQUEST]: errorResponse('Validation error'),
    [HTTP_STATUS.RATE_LIMIT_EXCEEDED]: errorResponse('Rate limit exceeded'),
  },
})

const mobileRefreshRoute = createRoute({
  method: 'post',
  path: '/mobile/refresh',
  tags: ['Auth - Mobile'],
  summary: 'Refresh access token (body-based)',
  request: {
    body: {
      content: { 'application/json': { schema: refreshTokenBodySchema } },
    },
  },
  responses: {
    [HTTP_STATUS.OK]: successResponse(mobileRefreshResultSchema, 'Token refreshed'),
    [HTTP_STATUS.BAD_REQUEST]: errorResponse('Missing refresh token'),
    [HTTP_STATUS.UNAUTHORIZED]: errorResponse('Invalid or expired token'),
    [HTTP_STATUS.RATE_LIMIT_EXCEEDED]: errorResponse('Rate limit exceeded'),
  },
})

const mobileLogoutRoute = createRoute({
  method: 'post',
  path: '/mobile/logout',
  tags: ['Auth - Mobile'],
  summary: 'Logout (mobile)',
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: refreshTokenBodySchema } },
    },
  },
  responses: {
    [HTTP_STATUS.OK]: successResponse(nullDataSchema, 'Logged out'),
    [HTTP_STATUS.UNAUTHORIZED]: errorResponse('Not authenticated'),
    [HTTP_STATUS.RATE_LIMIT_EXCEEDED]: errorResponse('Rate limit exceeded'),
  },
})

const app = new OpenAPIHono<AppEnv>()

app.use('*', rateLimiterFunc)

// app.use(path, middleware) retourne Hono et non OpenAPIHono
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

  .openapi(loginRoute, async (c) => {
    const env = c.get('env')
    const ctx = buildAuthContext(c)
    const { email, password } = c.req.valid('json')

    const result = await login(ctx, email, password)

    if (!isApiSuccess(result)) {
      return c.json(err(result.error), errorToStatus(result.error, authErrorMapping)) as never
    }

    setRefreshTokenCookie(c, result.data.refreshToken, env)

    return c.json(
      ok({ user: result.data.user, accessToken: result.data.accessToken }),
      HTTP_STATUS.OK
    )
  })

  .openapi(signupRoute, async (c) => {
    const env = c.get('env')
    const ctx = buildAuthContext(c)
    const { email, password } = c.req.valid('json')

    const result = await signup(ctx, email, password)

    if (!isApiSuccess(result)) {
      return c.json(err(result.error), errorToStatus(result.error, authErrorMapping)) as never
    }

    setRefreshTokenCookie(c, result.data.refreshToken, env)

    return c.json(
      ok({ user: result.data.user, accessToken: result.data.accessToken }),
      HTTP_STATUS.CREATED
    )
  })

  .openapi(browserRefreshRoute, async (c) => {
    const env = c.get('env')
    const ctx = buildAuthContext(c)
    const refreshToken = await extractRefreshToken(c)

    if (!refreshToken) {
      return c.json(err('missing_refresh_token'), HTTP_STATUS.BAD_REQUEST)
    }

    const result = await refresh(ctx, refreshToken)

    if (!isApiSuccess(result)) {
      clearRefreshTokenCookie(c)
      return c.json(err(result.error), errorToStatus(result.error, authErrorMapping)) as never
    }

    setRefreshTokenCookie(c, result.data.refreshToken, env)

    return c.json(
      ok({ user: result.data.user, accessToken: result.data.accessToken }),
      HTTP_STATUS.OK
    )
  })

  .openapi(logoutRoute, async (c) => {
    const ctx = buildAuthContext(c)
    const refreshToken = await extractRefreshToken(c)

    if (refreshToken) {
      await logout(ctx, refreshToken)
    }

    clearRefreshTokenCookie(c)

    return c.json(ok(null, 'Disconnected'), HTTP_STATUS.OK)
  })

  // Session

  .openapi(sessionRoute, (c) => {
    const userId = c.get('userId')
    return c.json(ok({ authenticated: true as const, userId }), HTTP_STATUS.OK)
  })

  // Mobile Routes

  .openapi(mobileLoginRoute, async (c) => {
    const ctx = buildAuthContext(c)
    const { email, password } = c.req.valid('json')

    const result = await login(ctx, email, password)

    if (!isApiSuccess(result)) {
      return c.json(err(result.error), errorToStatus(result.error, authErrorMapping)) as never
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

  .openapi(mobileSignupRoute, async (c) => {
    const ctx = buildAuthContext(c)
    const { email, password } = c.req.valid('json')

    const result = await signup(ctx, email, password)

    if (!isApiSuccess(result)) {
      return c.json(err(result.error), errorToStatus(result.error, authErrorMapping)) as never
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

  .openapi(mobileRefreshRoute, async (c) => {
    const ctx = buildAuthContext(c)
    const { refreshToken } = c.req.valid('json')

    if (!refreshToken) {
      return c.json(err('missing_refresh_token'), HTTP_STATUS.BAD_REQUEST)
    }

    const result = await refresh(ctx, refreshToken)

    if (!isApiSuccess(result)) {
      return c.json(err(result.error), errorToStatus(result.error, authErrorMapping)) as never
    }

    return c.json(
      ok({
        accessToken: result.data.accessToken,
        refreshToken: result.data.refreshToken,
      }),
      HTTP_STATUS.OK
    )
  })

  .openapi(mobileLogoutRoute, async (c) => {
    const ctx = buildAuthContext(c)
    const { refreshToken } = c.req.valid('json')

    if (refreshToken) {
      await logout(ctx, refreshToken)
    }

    return c.json(ok(null, 'Disconnected'), HTTP_STATUS.OK)
  })
