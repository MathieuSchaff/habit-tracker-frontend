import { err, HTTP_STATUS } from '@habit-tracker/shared'

import type { Context, MiddlewareHandler, Next } from 'hono'
import { rateLimiter } from 'hono-rate-limiter'

import type { AppEnv } from '../app-env'

// https://honohub.dev/docs/rate-limiter/configuration
// a regarder s'il faut changer le store
// pour l'instant le store est :
// "By default, hono-rate-limiter uses an in-memory store (MemoryStore)"
// Il faudrait plus tard changer le store
const skipLimiter = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'

function clientIp(c: Context): string {
  return (
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-real-ip') ||
    'unknown'
  )
}

export const rateLimiterFunc: MiddlewareHandler<AppEnv> = skipLimiter
  ? async (_c: Context, next: Next) => await next()
  : rateLimiter<AppEnv>({
      windowMs: 15 * 60 * 1000,
      limit: 100,
      standardHeaders: 'draft-7',
      keyGenerator: (c) => `rate:${clientIp(c)}`,
      handler: (c) =>
        c.json(
          err('rate_limit_exceeded', {
            retryAfter: c.res.headers.get('Retry-After'),
          }),
          HTTP_STATUS.RATE_LIMIT_EXCEEDED
        ),

      skip: (c) =>
        c.req.path === '/health' || c.req.path === '/ping' || c.req.path === '/favicon.ico',
      skipFailedRequests: true,
    })

// Stricter limiter for /auth/login and /auth/mobile/login. Unlike the global
// one, it COUNTS failed requests — that's the whole point: blunting password
// spraying. Paired with per-user DB lockout (see auth/service.ts) for accounts
// targeted across rotating IPs.
export const loginRateLimiterFunc: MiddlewareHandler<AppEnv> = skipLimiter
  ? async (_c: Context, next: Next) => await next()
  : rateLimiter<AppEnv>({
      windowMs: 15 * 60 * 1000,
      limit: 10,
      standardHeaders: 'draft-7',
      keyGenerator: (c) => `login:${clientIp(c)}`,
      handler: (c) =>
        c.json(
          err('too_many_requests', {
            retryAfter: c.res.headers.get('Retry-After'),
          }),
          HTTP_STATUS.RATE_LIMIT_EXCEEDED
        ),
      skipFailedRequests: false,
    })
