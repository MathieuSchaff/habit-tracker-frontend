import { HTTP_STATUS, ok, reactionInputSchema, reactionQuerySchema } from '@aurore/shared'

import { Hono } from 'hono'

import type { AppEnv } from '../../app-env'
import { zValidator } from '../../utils/validator'
import {
  getAuthedUserId,
  optionalJwtAuth,
  requireJwtAuth,
  requireNotBanned,
} from '../auth/middleware'
import { withRlsContext } from '../auth/rls-context.middleware'
import { listReactions, react, unreact } from './reactions.service'

const app = new Hono<AppEnv>()

// Per-route guards (NOT a blanket use('*') on the prefix): this sub-router shares
// the /api/social prefix with socialRoutes + socialPostsRoutes, so a blanket guard
// would leak onto siblings (reference_hono_comount_guard_leak). GET is an
// anonymous-OK signed read; non-GET is auth + the global-ban floor only — no
// dedicated ban_scope (ADR-0013).
app.use('*', async (c, next) =>
  c.req.method === 'GET' ? optionalJwtAuth(c, next) : requireJwtAuth(c, next)
)
app.use('*', async (c, next) => (c.req.method === 'GET' ? next() : requireNotBanned(c, next)))
app.use('*', withRlsContext)

export const socialReactionsRoutes = app
  .get('/', zValidator('query', reactionQuerySchema), async (c) => {
    const db = c.get('db')
    const { reactableType, reactableId } = c.req.valid('query')
    const viewerUserId = c.get('userId') ?? null
    const view = await listReactions(db, reactableType, reactableId, viewerUserId)
    return c.json(ok(view), HTTP_STATUS.OK)
  })
  .post('/', zValidator('json', reactionInputSchema), async (c) => {
    const db = c.get('db')
    const userId = getAuthedUserId(c)
    const view = await react(userId, c.req.valid('json'), db)
    return c.json(ok(view), HTTP_STATUS.OK)
  })
  .delete('/', zValidator('json', reactionInputSchema), async (c) => {
    const db = c.get('db')
    const userId = getAuthedUserId(c)
    const view = await unreact(userId, c.req.valid('json'), db)
    return c.json(ok(view), HTTP_STATUS.OK)
  })
