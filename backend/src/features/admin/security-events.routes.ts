import { HTTP_STATUS, listSecurityEventsQuerySchema, ok } from '@aurore/shared'

import { Hono } from 'hono'

import type { AppEnv } from '../../app-env'
import { rateLimiterFunc } from '../../utils/rateLimiter'
import { zValidator } from '../../utils/validator'
import { requireAdmin, requireJwtAuth, requireNotBanned } from '../auth/middleware'
import { withRlsContext } from '../auth/rls-context.middleware'
import { listSecurityEvents } from '../security/security.service'

const app = new Hono<AppEnv>()

app.use('*', rateLimiterFunc)
app.use('*', requireJwtAuth)
app.use('*', requireNotBanned)
// Security feed is an ops surface, not content moderation → admin-only. Unique
// '/api/admin/security-events' prefix with no contributor-reachable siblings → blanket guard safe.
app.use('*', requireAdmin)
// security_events has no RLS today; chain kept consistent so enableRLS() needs no route change.
app.use('*', withRlsContext)

export const adminSecurityEventsRoutes = app.get(
  '/',
  zValidator('query', listSecurityEventsQuerySchema),
  async (c) => {
    const filters = c.req.valid('query')
    const result = await listSecurityEvents(c.get('db'), filters)
    return c.json(ok(result), HTTP_STATUS.OK)
  }
)
