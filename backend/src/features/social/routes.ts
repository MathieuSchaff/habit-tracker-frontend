import { feedQuerySchema, HTTP_STATUS, ok, SKIN_CONCERNS } from '@aurore/shared'

import { Hono } from 'hono'
import { z } from 'zod'

import type { AppEnv } from '../../app-env'
import { zValidator } from '../../utils/validator'
import { getAuthedUserId, requireJwtAuth } from '../auth/middleware'
import { withRlsContext } from '../auth/rls-context.middleware'
import { feed } from './feed.service'
import { rankSimilarProfiles, searchProfilesByConcern } from './service'

const app = new Hono<AppEnv>()

// Guards are per-route, NOT a blanket use('*'): the posts sub-router mounts under
// the same /api/social prefix and allows anonymous GET, so a blanket guard here
// would leak onto it (see reference_hono_comount_guard_leak). withRlsContext binds
// app_runtime so cross-user dermo reads pass through the discoverable RLS policy.
const searchQuerySchema = z.object({ concern: z.enum(SKIN_CONCERNS) })

export const socialRoutes = app
  .get('/similar', requireJwtAuth, withRlsContext, async (c) => {
    const db = c.get('db')
    const viewerUserId = getAuthedUserId(c)
    const profiles = await rankSimilarProfiles(db, viewerUserId)
    return c.json(ok({ profiles }), HTTP_STATUS.OK)
  })
  .get(
    '/profiles/search',
    requireJwtAuth,
    withRlsContext,
    zValidator('query', searchQuerySchema),
    async (c) => {
      const db = c.get('db')
      const viewerUserId = getAuthedUserId(c)
      const { concern } = c.req.valid('query')
      const profiles = await searchProfilesByConcern(db, concern, viewerUserId)
      return c.json(ok({ profiles }), HTTP_STATUS.OK)
    }
  )
  .get('/feed', requireJwtAuth, withRlsContext, zValidator('query', feedQuerySchema), async (c) => {
    const db = c.get('db')
    const viewerUserId = getAuthedUserId(c)
    const result = await feed(db, viewerUserId, c.req.valid('query'))
    return c.json(ok(result), HTTP_STATUS.OK)
  })
