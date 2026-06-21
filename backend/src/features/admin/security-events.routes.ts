import { HTTP_STATUS, listSecurityEventsQuerySchema, ok } from '@aurore/shared'

import { zValidator } from '../../utils/validator'
import { requireAdmin } from '../auth/middleware'
import { listSecurityEvents } from '../security/security.service'
import { createAdminGuardedRouter } from './_guarded-router'

// Security feed is an ops surface, not content moderation → admin-only. Unique
// '/api/admin/security-events' prefix with no contributor-reachable siblings → blanket guard safe.
export const adminSecurityEventsRoutes = createAdminGuardedRouter(requireAdmin).get(
  '/',
  zValidator('query', listSecurityEventsQuerySchema),
  async (c) => {
    const filters = c.req.valid('query')
    const result = await listSecurityEvents(c.get('db'), filters)
    return c.json(ok(result), HTTP_STATUS.OK)
  }
)
