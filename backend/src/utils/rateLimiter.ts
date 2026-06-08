import { err, HTTP_STATUS } from '@aurore/shared'

import type { Context, MiddlewareHandler, Next } from 'hono'
import { rateLimiter } from 'hono-rate-limiter'

import type { AppEnv } from '../app-env'
import { clientIp } from './clientIp'

// https://honohub.dev/docs/rate-limiter/configuration
// In-memory store (MemoryStore) by default; switch to Redis for multi-replica.
const skipLimiter = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'

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

// Defense-in-depth blanket limiter mounted at the root app, covering read
// routes too (per-feature limiters only guard auth/admin/write). Distinct
// instance from rateLimiterFunc so the shared per-feature store isn't counted
// twice for routes that hit both. Skips /api/health so uptime probes aren't
// throttled (paths are absolute at the root, unlike sub-router mounts).
export const globalRateLimiterFunc: MiddlewareHandler<AppEnv> = skipLimiter
  ? async (_c: Context, next: Next) => await next()
  : rateLimiter<AppEnv>({
      windowMs: 15 * 60 * 1000,
      limit: 100,
      standardHeaders: 'draft-7',
      keyGenerator: (c) => `rate-global:${clientIp(c)}`,
      handler: (c) =>
        c.json(
          err('rate_limit_exceeded', {
            retryAfter: c.res.headers.get('Retry-After'),
          }),
          HTTP_STATUS.RATE_LIMIT_EXCEEDED
        ),
      skip: (c) => c.req.path.startsWith('/api/health'),
      skipFailedRequests: true,
    })

// Stricter limiter for /auth/login and /auth/mobile/login. Unlike the global
// one, it COUNTS failed requests, that's the whole point: blunting password
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
