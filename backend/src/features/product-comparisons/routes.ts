import {
  createComparisonSchema,
  HTTP_STATUS,
  ok,
  updateComparisonSchema,
} from '@habit-tracker/shared'

import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import type { AppEnv } from '../../app-env'
import { requireJwtAuth } from '../auth/middleware'
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
app.use('*', withRlsContext)

export const productComparisonRoutes = app
  .get('/', async (c) => {
    const userId = c.get('userId')
    const db = c.get('db')
    const items = await listComparisons(userId, db)
    return c.json(ok(items), HTTP_STATUS.OK)
  })
  .post('/', zValidator('json', createComparisonSchema), async (c) => {
    const userId = c.get('userId')
    const db = c.get('db')
    const input = c.req.valid('json')
    const created = await createComparison(userId, input, db)
    return c.json(ok(created), HTTP_STATUS.CREATED)
  })
  .get('/:id', zValidator('param', idParam), async (c) => {
    const userId = c.get('userId')
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
      const userId = c.get('userId')
      const db = c.get('db')
      const { id } = c.req.valid('param')
      const input = c.req.valid('json')
      await updateComparison(userId, id, input, db)
      const enriched = await getEnrichedComparison(userId, id, db)
      return c.json(ok(enriched), HTTP_STATUS.OK)
    }
  )
  .delete('/:id', zValidator('param', idParam), async (c) => {
    const userId = c.get('userId')
    const db = c.get('db')
    const { id } = c.req.valid('param')
    await deleteComparison(userId, id, db)
    return c.body(null, 204)
  })
