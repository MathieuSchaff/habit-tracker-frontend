import {
  HTTP_STATUS,
  listReportsQuerySchema,
  ok,
  resolveReportBodySchema,
} from '@habit-tracker/shared'

import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import type { AppEnv } from '../../app-env'
import { logger } from '../../lib/logger'
import { rateLimiterFunc } from '../../utils/rateLimiter'
import {
  getAuthedUserId,
  requireContentModerator,
  requireJwtAuth,
  requireNotBanned,
} from '../auth/middleware'
import { withRlsContext } from '../auth/rls-context.middleware'
import { listReports, resolveReport } from '../reports/service'

const reportIdParam = z.object({ id: z.uuid() })

const app = new Hono<AppEnv>()

app.use('*', rateLimiterFunc)
app.use('*', requireJwtAuth)
app.use('*', requireNotBanned)
// The report queue is owned by the moderator (admin∨contributor), not admin-only
// (ADR-0006 S1). All routes here are list + resolve/dismiss → blanket guard is safe.
app.use('*', requireContentModerator)
// content_reports has no RLS today, but the chain stays consistent with
// bans/moderation so any future enableRLS() on the table is covered.
app.use('*', withRlsContext)

export const adminReportsRoutes = app
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
