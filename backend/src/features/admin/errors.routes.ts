import {
  err,
  HTTP_STATUS,
  listErrorGroupsQuerySchema,
  ok,
  resolveErrorGroupBodySchema,
} from '@aurore/shared'

import { z } from 'zod'

import { logger } from '../../lib/logger'
import { zValidator } from '../../utils/validator'
import { getAuthedUserId, requireAdmin } from '../auth/middleware'
import { listErrorGroups, resolveErrorGroup } from '../errors/service'
import { createAdminGuardedRouter } from './_guarded-router'

const errorIdParam = z.object({ id: z.uuid() })

// Prod error tracker is an ops surface, not content moderation → admin-only. The
// '/api/admin/errors' prefix has no contributor-reachable siblings, so a blanket guard is safe.
export const adminErrorsRoutes = createAdminGuardedRouter(requireAdmin)
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
