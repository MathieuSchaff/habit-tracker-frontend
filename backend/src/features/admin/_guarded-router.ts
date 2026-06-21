import type { MiddlewareHandler } from 'hono'
import { Hono } from 'hono'

import type { AppEnv } from '../../app-env'
import { rateLimiterFunc } from '../../utils/rateLimiter'
import { requireJwtAuth, requireNotBanned } from '../auth/middleware'
import { withRlsContext } from '../auth/rls-context.middleware'

// Canonical admin guard chain shared by the unique-prefix '/api/admin/<x>' sub-routers.
// `guard` (requireAdmin | requireContentModerator) is the only axis that varies.
// withRlsContext stays in-chain so enabling RLS on these tables needs no route change.
// Blanket use('*') is safe only because each prefix has no contributor-reachable sibling.
export function createAdminGuardedRouter(guard: MiddlewareHandler<AppEnv>) {
  return new Hono<AppEnv>()
    .use('*', rateLimiterFunc)
    .use('*', requireJwtAuth)
    .use('*', requireNotBanned)
    .use('*', guard)
    .use('*', withRlsContext)
}
