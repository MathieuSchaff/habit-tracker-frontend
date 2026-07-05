import type { Hono } from 'hono'

import type { AppEnv } from '../../app-env'
import { rateLimiterFunc } from '../../utils/rateLimiter'
import { requireJwtAuth, requireNotBanned } from './middleware'
import { withRlsContext } from './rls-context.middleware'

// Shared blanket prelude for authenticated routers (rate limit → JWT → not-banned → RLS tx).
// Factored so the four guards cannot silently drift across the admin/moderation/role-request
// routers. Per-route authz (requireAdmin/requireContentModerator) stays inline at each route:
// these routers share mount prefixes, so a blanket authz guard would leak onto siblings
// and block contributor-reachable routes. Mutates and returns the app so chaining preserves AppType.
export const applyAuthedGuards = (app: Hono<AppEnv>): Hono<AppEnv> => {
  app.use('*', rateLimiterFunc)
  app.use('*', requireJwtAuth)
  app.use('*', requireNotBanned)
  app.use('*', withRlsContext)
  return app
}
