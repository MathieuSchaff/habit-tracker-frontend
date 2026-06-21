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

import { z } from 'zod'

import { logger } from '../../lib/logger'
import { zValidator } from '../../utils/validator'
import { getAuthedUserId, requireAdmin } from '../auth/middleware'
import { listRoleRequests, reviewRoleRequest } from '../role-requests/service'
import { createAdminGuardedRouter } from './_guarded-router'

const requestIdParam = z.object({ id: z.uuid() })

// Account elevation is admin-only. Unique '/api/admin/role-requests' prefix with no
// contributor-reachable siblings, so a blanket guard is safe.
export const adminRoleRequestsRoutes = createAdminGuardedRouter(requireAdmin)
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
