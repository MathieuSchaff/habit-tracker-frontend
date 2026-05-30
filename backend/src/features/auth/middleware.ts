import { type BanScope, err, HTTP_STATUS } from '@habit-tracker/shared'

import type { Context, Next } from 'hono'

import type { AppEnv } from '../../app-env'
import { isUserBanned, isUserBannedForScope } from './ban.service'
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

// Gates admin-only routes. Must run after requireJwtAuth (needs userRole).
// 403 forbidden when caller is not an admin.
export const requireAdmin = async (c: Context<AppEnv>, next: Next) => {
  if (c.get('userRole') !== 'admin') {
    return c.json(err('forbidden'), HTTP_STATUS.FORBIDDEN)
  }
  await next()
}

// Gates catalog-write routes: admin OR contributor. Runs after requireJwtAuth
// (needs userRole). Applied per-route on write verbs, so a wrong-role caller gets
// a clean 403 before the handler writes; RLS is the DB-level backstop (VULN-5).
export const requireCatalogWrite = async (c: Context<AppEnv>, next: Next) => {
  const role = c.get('userRole')
  if (role !== 'admin' && role !== 'contributor') {
    return c.json(err('forbidden'), HTTP_STATUS.FORBIDDEN)
  }
  await next()
}

// Gates content-moderation routes: admin OR contributor. Runs after requireJwtAuth
// (needs userRole). The contributor (« modérateur ») wields the reversible,
// content-scoped subset (hide/restore reviews/threads/replies, own the report queue);
// the irreversible/account-level subset (force-private, bans) stays behind requireAdmin.
export const requireContentModerator = async (c: Context<AppEnv>, next: Next) => {
  const role = c.get('userRole')
  if (role !== 'admin' && role !== 'contributor') {
    return c.json(err('forbidden'), HTTP_STATUS.FORBIDDEN)
  }
  await next()
}

// Route-level gate for per-action bans (e.g. 'product_create', 'product_edit',
// 'ingredient_edit'). The global 'global' scope is already enforced by
// requireNotBanned upstream — this checks the action-specific scope only.
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

// Read the identity that requireJwtAuth guarantees. Throws if no guard ran — a
// loud programmer error instead of a silent undefined leaking into a service.
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
