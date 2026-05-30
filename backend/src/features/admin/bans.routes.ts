import {
  adminBanErrorMapping,
  createBanBodySchema,
  err,
  errorToStatus,
  HTTP_STATUS,
  isApiSuccess,
  ok,
  updateBanBodySchema,
} from '@aurore/shared'

import { Hono } from 'hono'
import { z } from 'zod'

import type { AppEnv } from '../../app-env'
import { logger } from '../../lib/logger'
import { rateLimiterFunc } from '../../utils/rateLimiter'
import { zValidator } from '../../utils/validator'
import { getAuthedUserId, requireAdmin, requireJwtAuth, requireNotBanned } from '../auth/middleware'
import { withRlsContext } from '../auth/rls-context.middleware'
import { createBan, liftBan, listUserBans, listUsers, updateBan } from './bans.service'
import { getAdminDashboard } from './dashboard.service'

const userIdParam = z.object({ id: z.uuid() })
const banIdParam = z.object({ banId: z.uuid() })

const app = new Hono<AppEnv>()

app.use('*', rateLimiterFunc)
app.use('*', requireJwtAuth)
app.use('*', requireNotBanned)
// requireAdmin is applied PER-ROUTE below, NOT blanket: this router mounts at
// '/api/admin', a prefix of the moderation/reports routers, so a blanket use('*')
// guard leaks onto those siblings (Hono co-mount) and would re-impose admin-only on
// the contributor-reachable moderation surface (ADR-0006 S1). Every bans route is
// admin-only, so each carries requireAdmin explicitly.
// Binds app.role='admin' inside a tx so admin_bypass RLS policies fire on
// the cross-user writes that admin bans perform (user_bans, profiles).
// Without it, app_runtime (NO BYPASSRLS) sees auth.role()=NULL and every
// INSERT/UPDATE/DELETE on FORCE-RLS tables touches 0 rows.
app.use('*', withRlsContext)

export const adminBansRoutes = app
  .post(
    '/users/:id/bans',
    requireAdmin,
    zValidator('param', userIdParam),
    zValidator('json', createBanBodySchema),
    async (c) => {
      const { id: targetUserId } = c.req.valid('param')
      const body = c.req.valid('json')
      const adminId = getAuthedUserId(c)

      const result = await createBan(c.get('db'), { adminId, targetUserId, body })

      if (!isApiSuccess(result)) {
        return c.json(err(result.error), errorToStatus(result.error, adminBanErrorMapping))
      }

      logger.info(
        { adminId, targetUserId, scope: body.scope, expiresAt: body.expiresAt ?? null },
        'ban created'
      )
      return c.json(ok(result.data), HTTP_STATUS.CREATED)
    }
  )
  .get('/users/:id/bans', requireAdmin, zValidator('param', userIdParam), async (c) => {
    const { id: targetUserId } = c.req.valid('param')
    const rows = await listUserBans(c.get('db'), targetUserId)
    return c.json(ok(rows), HTTP_STATUS.OK)
  })
  .delete('/bans/:banId', requireAdmin, zValidator('param', banIdParam), async (c) => {
    const { banId } = c.req.valid('param')
    const adminId = getAuthedUserId(c)

    const result = await liftBan(c.get('db'), banId)

    if (!isApiSuccess(result)) {
      return c.json(err(result.error), errorToStatus(result.error, adminBanErrorMapping))
    }

    logger.info({ adminId, banId }, 'ban lifted')
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
  .get('/users', requireAdmin, async (c) => {
    const items = await listUsers(c.get('db'))
    return c.json(ok({ items }), HTTP_STATUS.OK)
  })
  .get('/dashboard', requireAdmin, async (c) => {
    const dashboard = await getAdminDashboard(c.get('db'))
    return c.json(ok(dashboard), HTTP_STATUS.OK)
  })
