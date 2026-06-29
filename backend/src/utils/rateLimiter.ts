import { err, HTTP_STATUS } from '@aurore/shared'

import type { Context, MiddlewareHandler, Next } from 'hono'
import { rateLimiter } from 'hono-rate-limiter'

import type { AppEnv } from '../app-env'
import { clientIp } from './clientIp'

// https://honohub.dev/docs/rate-limiter/configuration
// In-memory store (MemoryStore) by default; switch to Redis for multi-replica.
const skipLimiter = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'

// SPA fans out many GETs per page (loaders + React Query retries), so a low cap bricks normal browsing; 1000 still blunts scraping/DoS. Login limited separately.
const BROWSE_LIMIT = 1000

export const rateLimiterFunc: MiddlewareHandler<AppEnv> = skipLimiter
  ? async (_c: Context, next: Next) => await next()
  : rateLimiter<AppEnv>({
      windowMs: 15 * 60 * 1000,
      limit: BROWSE_LIMIT,
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
// twice for routes that hit both. Skips /api/health + /api/ready so uptime probes
// aren't throttled (paths are absolute at the root, unlike sub-router mounts).
export const globalRateLimiterFunc: MiddlewareHandler<AppEnv> = skipLimiter
  ? async (_c: Context, next: Next) => await next()
  : rateLimiter<AppEnv>({
      windowMs: 15 * 60 * 1000,
      limit: BROWSE_LIMIT,
      standardHeaders: 'draft-7',
      keyGenerator: (c) => `rate-global:${clientIp(c)}`,
      handler: (c) =>
        c.json(
          err('rate_limit_exceeded', {
            retryAfter: c.res.headers.get('Retry-After'),
          }),
          HTTP_STATUS.RATE_LIMIT_EXCEEDED
        ),
      skip: (c) => c.req.path.startsWith('/api/health') || c.req.path.startsWith('/api/ready'),
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

// Throttles /auth/demo per IP. Each success writes a full demo account (~50 seed
// rows); the daily sweep reclaims them but a burst still amplifies writes, so this
// COUNTS all requests (own bucket) to cap account creation per window.
export const demoRateLimiterFunc: MiddlewareHandler<AppEnv> = skipLimiter
  ? async (_c: Context, next: Next) => await next()
  : rateLimiter<AppEnv>({
      windowMs: 15 * 60 * 1000,
      limit: 5,
      standardHeaders: 'draft-7',
      keyGenerator: (c) => `demo:${clientIp(c)}`,
      handler: (c) =>
        c.json(
          err('too_many_requests', {
            retryAfter: c.res.headers.get('Retry-After'),
          }),
          HTTP_STATUS.RATE_LIMIT_EXCEEDED
        ),
      skipFailedRequests: false,
    })

// Throttles /auth/forgot-password per IP. Mail-spam surface: every request can send
// an email, so this COUNTS all requests (own bucket, distinct from login) to blunt
// inbox bombing. A legit user rarely needs more than a handful of resets per window.
export const forgotPasswordRateLimiterFunc: MiddlewareHandler<AppEnv> = skipLimiter
  ? async (_c: Context, next: Next) => await next()
  : rateLimiter<AppEnv>({
      windowMs: 15 * 60 * 1000,
      limit: 5,
      standardHeaders: 'draft-7',
      keyGenerator: (c) => `forgot:${clientIp(c)}`,
      handler: (c) =>
        c.json(
          err('too_many_requests', {
            retryAfter: c.res.headers.get('Retry-After'),
          }),
          HTTP_STATUS.RATE_LIMIT_EXCEEDED
        ),
      skipFailedRequests: false,
    })

// Throttles /auth/reset-password per IP. The global limiter has skipFailedRequests:true,
// so the 400s from probing random tokens never consume its quota — uncapped probe
// throughput against the token lookup. This own bucket COUNTS failures (like login) to
// cap that, complementing the cheap pre-check that already blocks argon2 CPU exhaustion.
export const resetPasswordRateLimiterFunc: MiddlewareHandler<AppEnv> = skipLimiter
  ? async (_c: Context, next: Next) => await next()
  : rateLimiter<AppEnv>({
      windowMs: 15 * 60 * 1000,
      limit: 10,
      standardHeaders: 'draft-7',
      keyGenerator: (c) => `reset:${clientIp(c)}`,
      handler: (c) =>
        c.json(
          err('too_many_requests', {
            retryAfter: c.res.headers.get('Retry-After'),
          }),
          HTTP_STATUS.RATE_LIMIT_EXCEEDED
        ),
      skipFailedRequests: false,
    })
