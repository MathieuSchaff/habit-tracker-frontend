import {
  err,
  errorToStatus,
  HTTP_STATUS,
  isApiSuccess,
  listRoleRequestsQuerySchema,
  ok,
  reviewRoleRequestBodySchema,
  reviewRoleRequestErrorMapping,
} from '@aurore/shared'

import { Hono } from 'hono'
import { z } from 'zod'

import type { AppEnv } from '../../app-env'
import { logger } from '../../lib/logger'
import { rateLimiterFunc } from '../../utils/rateLimiter'
import { zValidator } from '../../utils/validator'
import { getAuthedUserId, requireAdmin, requireJwtAuth, requireNotBanned } from '../auth/middleware'
import { withRlsContext } from '../auth/rls-context.middleware'
import { listRoleRequests, reviewRoleRequest } from '../role-requests/service'

const requestIdParam = z.object({ id: z.uuid() })

const app = new Hono<AppEnv>()

app.use('*', rateLimiterFunc)
app.use('*', requireJwtAuth)
app.use('*', requireNotBanned)
// Account elevation is admin-only. This router has a unique '/api/admin/role-requests'
// prefix with no contributor-reachable siblings, so a blanket guard is safe (unlike the
// '/api/admin' bans router, whose shared prefix forces per-route guards).
app.use('*', requireAdmin)
app.use('*', withRlsContext)

export const adminRoleRequestsRoutes = app
  .get('/', zValidator('query', listRoleRequestsQuerySchema), async (c) => {
    const filters = c.req.valid('query')
    const result = await listRoleRequests(c.get('db'), filters)
    return c.json(ok(result), HTTP_STATUS.OK)
  })
  .patch(
    '/:id',
    zValidator('param', requestIdParam),
    zValidator('json', reviewRoleRequestBodySchema),
    async (c) => {
      const { id } = c.req.valid('param')
      const review = c.req.valid('json')
      const adminId = getAuthedUserId(c)

      const result = await reviewRoleRequest(c.get('db'), { id, adminId, review })
      if (!isApiSuccess(result)) {
        return c.json(err(result.error), errorToStatus(result.error, reviewRoleRequestErrorMapping))
      }

      logger.info({ adminId, requestId: id, decision: review.decision }, 'role request reviewed')
      return c.json(ok(result.data), HTTP_STATUS.OK)
    }
  )
