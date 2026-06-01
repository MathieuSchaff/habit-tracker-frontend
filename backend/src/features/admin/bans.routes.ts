import {
  adminBanErrorMapping,
  adminRoleErrorMapping,
  createBanBodySchema,
  err,
  errorToStatus,
  HTTP_STATUS,
  isApiSuccess,
  ok,
  updateBanBodySchema,
  updateRoleBodySchema,
} from '@aurore/shared'

import { Hono } from 'hono'
import { z } from 'zod'

import type { AppEnv } from '../../app-env'
import { logger } from '../../lib/logger'
import { rateLimiterFunc } from '../../utils/rateLimiter'
import { zValidator } from '../../utils/validator'
import {
  getAuthedUserId,
  getAuthedUserRole,
  requireAdmin,
  requireContentModerator,
  requireJwtAuth,
  requireNotBanned,
} from '../auth/middleware'
import { withRlsContext } from '../auth/rls-context.middleware'
import { createBan, getBanScope, liftBan, listUserBans, listUsers, updateBan } from './bans.service'
import { getAdminDashboard } from './dashboard.service'
import { demoteToUser } from './roles.service'

const userIdParam = z.object({ id: z.uuid() })
const banIdParam = z.object({ banId: z.uuid() })

const app = new Hono<AppEnv>()

app.use('*', rateLimiterFunc)
app.use('*', requireJwtAuth)
app.use('*', requireNotBanned)
// Guards are applied PER-ROUTE below, NOT blanket: this router mounts at
// '/api/admin', a prefix of the moderation/reports routers, so a blanket use('*')
// guard leaks onto those siblings (Hono co-mount) and would re-impose admin-only on
// the contributor-reachable moderation surface (ADR-0006 S1).
// Split (ADR-0006 S4): the contributor (« modérateur ») creates/lifts/lists the
// reversible content-scoped bans (scope !== 'global') via requireContentModerator +
// an in-handler scope gate; the account-level 'global' lockout and the admin tools
// (update, user list, dashboard) stay requireAdmin.
// Binds app.role='admin' inside a tx so admin_bypass RLS policies fire on
// the cross-user writes that admin bans perform (user_bans, profiles).
// Without it, app_runtime (NO BYPASSRLS) sees auth.role()=NULL and every
// INSERT/UPDATE/DELETE on FORCE-RLS tables touches 0 rows.
app.use('*', withRlsContext)

export const adminBansRoutes = app
  .post(
    '/users/:id/bans',
    requireContentModerator,
    zValidator('param', userIdParam),
    zValidator('json', createBanBodySchema),
    async (c) => {
      const { id: targetUserId } = c.req.valid('param')
      const body = c.req.valid('json')
      const actorId = getAuthedUserId(c)

      // A contributor wields only the content-scoped bans; 'global' (account lockout)
      // stays admin-only. Clean 403 before the write; RLS WITH CHECK is the DB backstop.
      if (getAuthedUserRole(c) !== 'admin' && body.scope === 'global') {
        return c.json(err('forbidden'), HTTP_STATUS.FORBIDDEN)
      }

      const result = await createBan(c.get('db'), { actorId, targetUserId, body })

      if (!isApiSuccess(result)) {
        return c.json(err(result.error), errorToStatus(result.error, adminBanErrorMapping))
      }

      logger.info(
        { actorId, targetUserId, scope: body.scope, expiresAt: body.expiresAt ?? null },
        'ban created'
      )
      return c.json(ok(result.data), HTTP_STATUS.CREATED)
    }
  )
  .get('/users/:id/bans', requireContentModerator, zValidator('param', userIdParam), async (c) => {
    const { id: targetUserId } = c.req.valid('param')
    const rows = await listUserBans(c.get('db'), targetUserId)
    return c.json(ok(rows), HTTP_STATUS.OK)
  })
  .delete('/bans/:banId', requireContentModerator, zValidator('param', banIdParam), async (c) => {
    const { banId } = c.req.valid('param')
    const actorId = getAuthedUserId(c)

    // A contributor may lift only content-scoped bans; lifting a 'global' ban stays admin.
    // This app-level gate is the guard in owner/BYPASSRLS contexts (route tests, dev). Under
    // prod RLS (app_runtime), getBanScope cannot see a 'global' row for a contributor (the
    // user_bans_moderation_scoped policy hides it) → scope is null → liftBan's 0-row DELETE
    // denies it as not_found (404). Either path keeps the ban; the RLS DELETE is the prod
    // enforcement (proven in tests/integration/user-bans-rls.test.ts).
    if (getAuthedUserRole(c) !== 'admin') {
      const scope = await getBanScope(c.get('db'), banId)
      if (scope === 'global') {
        return c.json(err('forbidden'), HTTP_STATUS.FORBIDDEN)
      }
    }

    const result = await liftBan(c.get('db'), banId)

    if (!isApiSuccess(result)) {
      return c.json(err(result.error), errorToStatus(result.error, adminBanErrorMapping))
    }

    logger.info({ actorId, banId }, 'ban lifted')
    return c.json(ok(null, 'Ban lifted'), HTTP_STATUS.OK)
  })
  .patch(
    '/bans/:banId',
    requireAdmin,
    zValidator('param', banIdParam),
    zValidator('json', updateBanBodySchema),
    async (c) => {
      const { banId } = c.req.valid('param')
      const body = c.req.valid('json')
      const adminId = getAuthedUserId(c)

      const result = await updateBan(c.get('db'), banId, body)

      if (!isApiSuccess(result)) {
        return c.json(err(result.error), errorToStatus(result.error, adminBanErrorMapping))
      }

      logger.info(
        {
          adminId,
          banId,
          expiresAt: body.expiresAt ?? null,
          reasonChanged: body.reason !== undefined,
        },
        'ban updated'
      )
      return c.json(ok(result.data), HTTP_STATUS.OK)
    }
  )
  .patch(
    '/users/:id/role',
    requireAdmin,
    zValidator('param', userIdParam),
    zValidator('json', updateRoleBodySchema),
    async (c) => {
      const { id: targetUserId } = c.req.valid('param')
      const body = c.req.valid('json')
      const adminId = getAuthedUserId(c)

      const result = await demoteToUser(c.get('db'), {
        adminId,
        targetUserId,
        role: body.role,
      })

      if (!isApiSuccess(result)) {
        return c.json(err(result.error), errorToStatus(result.error, adminRoleErrorMapping))
      }

      // No role-change audit table exists; reason is operational context, logged
      // like other admin actions (ban lifted / report escalated), not persisted.
      logger.info({ adminId, targetUserId, reason: body.reason ?? null }, 'contributor demoted')
      return c.json(ok(result.data), HTTP_STATUS.OK)
    }
  )
  .get('/users', requireAdmin, async (c) => {
    const items = await listUsers(c.get('db'))
    return c.json(ok({ items }), HTTP_STATUS.OK)
  })
  .get('/dashboard', requireAdmin, async (c) => {
    const dashboard = await getAdminDashboard(c.get('db'))
    return c.json(ok(dashboard), HTTP_STATUS.OK)
  })
