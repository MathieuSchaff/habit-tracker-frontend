import { HTTP_STATUS, listReportsQuerySchema, ok, resolveReportBodySchema } from '@aurore/shared'

import { z } from 'zod'

import { logger } from '../../lib/logger'
import { zValidator } from '../../utils/validator'
import { getAuthedUserId, requireContentModerator } from '../auth/middleware'
import { escalateReport, listReports, resolveReport } from '../reports/service'
import { createAdminGuardedRouter } from './_guarded-router'

const reportIdParam = z.object({ id: z.uuid() })

// Report queue is moderator-reachable, not admin-only (ADR-0006 S1); all routes are
// list/resolve/dismiss, so blanket guard is safe.
export const adminReportsRoutes = createAdminGuardedRouter(requireContentModerator)
  .get('/', zValidator('query', listReportsQuerySchema), async (c) => {
    const filters = c.req.valid('query')
    const result = await listReports(c.get('db'), filters)
    return c.json(ok(result), HTTP_STATUS.OK)
  })
  .patch(
    '/:id',
    zValidator('param', reportIdParam),
    zValidator('json', resolveReportBodySchema),
    async (c) => {
      const { id } = c.req.valid('param')
      const { status } = c.req.valid('json')
      const adminId = getAuthedUserId(c)

      const report = await resolveReport(c.get('db'), { id, adminId, status })
      logger.info({ adminId, reportId: id, status }, 'report resolved')
      return c.json(ok(report), HTTP_STATUS.OK)
    }
  )
  // ADR-0006 S3: both contributor and admin may escalate; blanket guard is correct, no ban power added.
  .patch('/:id/escalate', zValidator('param', reportIdParam), async (c) => {
    const { id } = c.req.valid('param')
    const moderatorId = getAuthedUserId(c)

    const report = await escalateReport(c.get('db'), { id, moderatorId })
    logger.info({ moderatorId, reportId: id }, 'report escalated')
    return c.json(ok(report), HTTP_STATUS.OK)
  })
