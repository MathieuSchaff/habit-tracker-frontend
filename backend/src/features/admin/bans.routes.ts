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
import { zValidator } from '../../utils/validator'
import { applyAuthedGuards } from '../auth/authed-guards'
import {
  getAuthedUserId,
  getAuthedUserRole,
  requireAdmin,
  requireContentModerator,
} from '../auth/middleware'
import { createBan, getBanScope, liftBan, listUserBans, listUsers, updateBan } from './bans.service'
import { getAdminDashboard } from './dashboard.service'
import { demoteToUser } from './roles.service'

const userIdParam = z.object({ id: z.uuid() })
const banIdParam = z.object({ banId: z.uuid() })

// Blanket guards (rate limit/JWT/not-banned/RLS) via applyAuthedGuards.
// Authz is per-route, not blanket: this router mounts at '/api/admin', a prefix
// shared with moderation/reports, so a blanket authz guard would leak onto those siblings
// and block contributor-reachable routes.
// Contributors handle content-scoped bans; global lockout and admin tools stay admin-only.
const app = applyAuthedGuards(new Hono<AppEnv>())

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

      // Contributors are restricted to content-scoped bans; 'global' (account lockout) stays admin-only.
      // Clean 403 before the write; RLS WITH CHECK is the DB backstop.
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

    // App-level gate for owner/BYPASSRLS contexts (tests, dev): contributors cannot lift 'global' bans.
    // Under prod RLS, the user_bans_moderation_scoped policy hides 'global' rows from contributors,
    // so getBanScope returns null and liftBan's 0-row DELETE yields not_found (404).
    // Either path prevents the lift; the RLS DELETE is the prod enforcement
    // (tested in tests/integration/user-bans-rls.test.ts).
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

      // No role-change audit table exists; reason is logged for operational context, not persisted.
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
