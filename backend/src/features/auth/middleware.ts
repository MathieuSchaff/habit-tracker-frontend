import { type BanScope, err, HTTP_STATUS } from '@aurore/shared'

import type { Context, Next } from 'hono'
import { getUserRole } from 'src/features/auth/user.utils'

import type { AppEnv } from '../../app-env'
import { isUserBanned, isUserBannedForScope } from './ban.service'
import { verifyAccessToken } from './jwt.utils'

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

// Must run after requireJwtAuth. Uses admin pool (c.get('db')), not RLS,
// because this is an identity-layer gate, not a user-scoped data read.
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

// Must run after requireJwtAuth (needs userRole).
export const requireAdmin = async (c: Context<AppEnv>, next: Next) => {
  if (c.get('userRole') !== 'admin') {
    return c.json(err('forbidden'), HTTP_STATUS.FORBIDDEN)
  }
  await next()
}

// admin OR contributor. Applied per-route on write verbs; RLS is the DB-level backstop (VULN-5).
export const requireCatalogWrite = async (c: Context<AppEnv>, next: Next) => {
  const userId = c.get('userId')
  const db = c.get('db')
  if (!userId) {
    return c.json(err('unauthorized'), HTTP_STATUS.UNAUTHORIZED)
  }
  const role = await getUserRole(db, userId)
  if (role !== 'admin' && role !== 'contributor') {
    return c.json(err('forbidden'), HTTP_STATUS.FORBIDDEN)
  }
  await next()
}

// admin OR contributor. Contributor ("modérateur") has reversible, content-scoped
// actions (hide/restore reviews, report queue). Irreversible account-level actions
// (force-private, bans) stay behind requireAdmin.
export const requireContentModerator = async (c: Context<AppEnv>, next: Next) => {
  const userId = c.get('userId')
  const db = c.get('db')
  if (!userId) {
    return c.json(err('unauthorized'), HTTP_STATUS.UNAUTHORIZED)
  }
  const role = await getUserRole(db, userId)
  if (role !== 'admin' && role !== 'contributor') {
    return c.json(err('forbidden'), HTTP_STATUS.FORBIDDEN)
  }
  await next()
}

// Checks action-specific scope only; 'global' is already enforced by requireNotBanned.
// Pair with requireJwtAuth + requireNotBanned in the router chain.
export const requireNotBannedScope =
  (scope: Exclude<BanScope, 'global'>) => async (c: Context<AppEnv>, next: Next) => {
    const userId = c.get('userId')
    if (!userId) return c.json(err('unauthorized'), HTTP_STATUS.UNAUTHORIZED)

    const ban = await isUserBannedForScope(c.get('db'), userId, scope)
    if (ban) {
      return c.json(
        err('banned', { expiresAt: ban.expiresAt, reason: ban.reason, scope }),
        HTTP_STATUS.FORBIDDEN
      )
    }
    await next()
  }

// Passes anonymous requests through unchanged; sets userId/userRole when a valid
// bearer is present. Use on public reads that personalize for logged-in callers.
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

// Throws if requireJwtAuth did not run: loud programmer error instead of silent undefined.
export function getAuthedUserId(c: Context<AppEnv>): string {
  const userId = c.get('userId')
  if (userId === undefined)
    throw new Error('getAuthedUserId: requireJwtAuth must run before this route')
  return userId
}

export function getAuthedUserRole(
  c: Context<AppEnv>
): NonNullable<AppEnv['Variables']['userRole']> {
  const role = c.get('userRole')
  if (role === undefined)
    throw new Error('getAuthedUserRole: requireJwtAuth must run before this route')
  return role
}
