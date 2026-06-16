import {
  err,
  HTTP_STATUS,
  listErrorGroupsQuerySchema,
  ok,
  resolveErrorGroupBodySchema,
} from '@aurore/shared'

import { Hono } from 'hono'
import { z } from 'zod'

import type { AppEnv } from '../../app-env'
import { logger } from '../../lib/logger'
import { rateLimiterFunc } from '../../utils/rateLimiter'
import { zValidator } from '../../utils/validator'
import { getAuthedUserId, requireAdmin, requireJwtAuth, requireNotBanned } from '../auth/middleware'
import { withRlsContext } from '../auth/rls-context.middleware'
import { listErrorGroups, resolveErrorGroup } from '../errors/service'

const errorIdParam = z.object({ id: z.uuid() })

const app = new Hono<AppEnv>()

app.use('*', rateLimiterFunc)
app.use('*', requireJwtAuth)
app.use('*', requireNotBanned)
// Prod error tracker is an ops surface, not content moderation → admin-only. The
// '/api/admin/errors' prefix has no contributor-reachable siblings, so a blanket guard
// is safe (same posture as role-requests, unlike the shared '/api/admin' bans router).
app.use('*', requireAdmin)
// error_groups has no RLS today; chain kept consistent so enableRLS() needs no route change.
app.use('*', withRlsContext)

export const adminErrorsRoutes = app
  .get('/', zValidator('query', listErrorGroupsQuerySchema), async (c) => {
    const filters = c.req.valid('query')
    const result = await listErrorGroups(c.get('db'), filters)
    return c.json(ok(result), HTTP_STATUS.OK)
  })
  .patch(
    '/:id',
    zValidator('param', errorIdParam),
    zValidator('json', resolveErrorGroupBodySchema),
    async (c) => {
      const { id } = c.req.valid('param')
      const { resolved } = c.req.valid('json')

      const group = await resolveErrorGroup(c.get('db'), { id, resolved })
      if (!group) return c.json(err('not_found'), HTTP_STATUS.NOT_FOUND)

      logger.info({ adminId: getAuthedUserId(c), groupId: id, resolved }, 'error group resolved')
      return c.json(ok(group), HTTP_STATUS.OK)
    }
  )
