import { err, HTTP_STATUS } from '@habit-tracker/shared'

import type { Context, Next } from 'hono'

import type { AppEnv } from '../../app-env'
import { isUserBanned } from './ban.service'
import { verifyAccessToken } from './jwt.utils'

/**
 * Middleware JWT : vérifie l'access token dans le header Authorization.
 * Si invalide ou expiré → 401 (le client doit appeler /api/auth//refresh).
 */
export const requireJwtAuth = async (c: Context<AppEnv>, next: Next) => {
  const authHeader = c.req.header('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json(err('unauthorized'), HTTP_STATUS.UNAUTHORIZED)
  }

  const token = authHeader.substring(7)
  const jwtSecret = c.get('jwtSecret')

  const payload = await verifyAccessToken(token, jwtSecret)

  if (!payload) {
    return c.json(err('unauthorized'), HTTP_STATUS.UNAUTHORIZED)
  }

  c.set('userId', payload.sub)
  c.set('userRole', payload.role)

  await next()
}

// Blocks requests when the authenticated user has an active 'global' ban.
// Must run AFTER requireJwtAuth so userId is set. Uses the admin pool via
// c.get('db'); RLS not required here — it's an identity-layer gate, not a
// data read on behalf of the user.
export const requireNotBanned = async (c: Context<AppEnv>, next: Next) => {
  const userId = c.get('userId')
  if (!userId) return c.json(err('unauthorized'), HTTP_STATUS.UNAUTHORIZED)

  const ban = await isUserBanned(c.get('db'), userId, 'global')
  if (ban) {
    return c.json(
      err('banned', { expiresAt: ban.expiresAt, reason: ban.reason }),
      HTTP_STATUS.FORBIDDEN
    )
  }
  await next()
}

// Populates userId/userRole when a valid bearer is present; otherwise lets the
// request through anonymously. Use on public reads that personalize when the
// caller is logged in (e.g. catalog list flagging products already on shelf).
export const optionalJwtAuth = async (c: Context<AppEnv>, next: Next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return next()

  const token = authHeader.substring(7)
  const payload = await verifyAccessToken(token, c.get('jwtSecret'))
  if (payload) {
    c.set('userId', payload.sub)
    c.set('userRole', payload.role)
  }
  return next()
}
