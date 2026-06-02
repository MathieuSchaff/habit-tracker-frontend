import {
  err,
  errorToStatus,
  HTTP_STATUS,
  listSuggestedEditsQuerySchema,
  ok,
  reviewSuggestedEditBodySchema,
} from '@aurore/shared'

import { Hono } from 'hono'
import { z } from 'zod'

import type { AppEnv } from '../../app-env'
import { logger } from '../../lib/logger'
import { rateLimiterFunc } from '../../utils/rateLimiter'
import { zValidator } from '../../utils/validator'
import {
  getAuthedUserId,
  requireContentModerator,
  requireJwtAuth,
  requireNotBanned,
} from '../auth/middleware'
import { withRlsContext } from '../auth/rls-context.middleware'
import { listSuggestedEdits, reviewSuggestedEdit } from '../suggested-edits/service'
import { SuggestedEditError } from '../suggested-edits/suggested-edit-error'

const editIdParam = z.object({ id: z.uuid() })

const app = new Hono<AppEnv>()

app.use('*', rateLimiterFunc)
app.use('*', requireJwtAuth)
app.use('*', requireNotBanned)
// All routes are moderator-reachable (list + review); no admin-only verb mixed in, blanket guard is safe.
app.use('*', requireContentModerator)
app.use('*', withRlsContext)

export const adminSuggestedEditsRoutes = app
  .get('/', zValidator('query', listSuggestedEditsQuerySchema), async (c) => {
    const filters = c.req.valid('query')
    const result = await listSuggestedEdits(c.get('db'), filters)
    return c.json(ok(result), HTTP_STATUS.OK)
  })
  .patch(
    '/:id',
    zValidator('param', editIdParam),
    zValidator('json', reviewSuggestedEditBodySchema),
    async (c) => {
      const { id } = c.req.valid('param')
      const { status } = c.req.valid('json')
      const reviewerId = getAuthedUserId(c)
      try {
        const edit = await reviewSuggestedEdit(c.get('db'), { id, reviewerId, status })
        logger.info({ reviewerId, editId: id, status }, 'suggested edit reviewed')
        return c.json(ok(edit), HTTP_STATUS.OK)
      } catch (e) {
        if (e instanceof SuggestedEditError) {
          return c.json(err(e.code), errorToStatus(e.code, {}))
        }
        throw e
      }
    }
  )
