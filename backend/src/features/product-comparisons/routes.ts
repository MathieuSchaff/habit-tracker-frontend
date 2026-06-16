import { createComparisonSchema, HTTP_STATUS, ok, updateComparisonSchema } from '@aurore/shared'

import { Hono } from 'hono'
import { z } from 'zod'

import type { AppEnv } from '../../app-env'
import { zValidator } from '../../utils/validator'
import { getAuthedUserId, requireJwtAuth, requireNotBanned } from '../auth/middleware'
import { withRlsContext } from '../auth/rls-context.middleware'
import {
  createComparison,
  deleteComparison,
  getEnrichedComparison,
  listComparisons,
  updateComparison,
} from './service'

const idParam = z.object({ id: z.uuid() })

const app = new Hono<AppEnv>()
app.use('*', requireJwtAuth)
app.use('*', requireNotBanned)
app.use('*', withRlsContext)

export const productComparisonRoutes = app
  .get('/', async (c) => {
    const userId = getAuthedUserId(c)
    const db = c.get('db')
    const items = await listComparisons(userId, db)
    return c.json(ok(items), HTTP_STATUS.OK)
  })
  .post('/', zValidator('json', createComparisonSchema), async (c) => {
    const userId = getAuthedUserId(c)
    const db = c.get('db')
    const input = c.req.valid('json')
    const created = await createComparison(userId, input, db)
    return c.json(ok(created), HTTP_STATUS.CREATED)
  })
  .get('/:id', zValidator('param', idParam), async (c) => {
    const userId = getAuthedUserId(c)
    const db = c.get('db')
    const { id } = c.req.valid('param')
    const enriched = await getEnrichedComparison(userId, id, db)
    return c.json(ok(enriched), HTTP_STATUS.OK)
  })
  .patch(
    '/:id',
    zValidator('param', idParam),
    zValidator('json', updateComparisonSchema),
    async (c) => {
      const userId = getAuthedUserId(c)
      const db = c.get('db')
      const { id } = c.req.valid('param')
      const input = c.req.valid('json')
      // Build the response from one snapshot: keep write + read-back in a
      // single (sub)tx locally, rather than leaning on the request-level RLS tx.
      const enriched = await db.transaction(async (tx) => {
        await updateComparison(userId, id, input, tx)
        return getEnrichedComparison(userId, id, tx)
      })
      return c.json(ok(enriched), HTTP_STATUS.OK)
    }
  )
  .delete('/:id', zValidator('param', idParam), async (c) => {
    const userId = getAuthedUserId(c)
    const db = c.get('db')
    const { id } = c.req.valid('param')
    await deleteComparison(userId, id, db)
    return c.body(null, 204)
  })
