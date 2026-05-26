import { createReportBodySchema, HTTP_STATUS, ok } from '@habit-tracker/shared'

import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

import type { AppEnv } from '../../app-env'
import { rateLimiterFunc } from '../../utils/rateLimiter'
import { getAuthedUserId, requireJwtAuth, requireNotBanned } from '../auth/middleware'
import { withRlsContext } from '../auth/rls-context.middleware'
import { createReport } from './service'

const app = new Hono<AppEnv>()

app.use('*', rateLimiterFunc)
app.use('*', requireJwtAuth)
app.use('*', requireNotBanned)
app.use('*', withRlsContext)

export const reportsRoutes = app.post(
  '/',
  zValidator('json', createReportBodySchema),
  async (c) => {
    const reporterId = getAuthedUserId(c)
    const body = c.req.valid('json')

    const report = await createReport(c.get('db'), { reporterId, body })
    return c.json(ok(report), HTTP_STATUS.CREATED)
  }
)
