import { compatibilityScoresRequestSchema, HTTP_STATUS, ok } from '@aurore/shared'

import { Hono } from 'hono'

import type { AppEnv } from '../../app-env'
import { zValidator } from '../../utils/validator'
import { getAuthedUserId, requireJwtAuth, requireNotBanned } from '../auth/middleware'
import { withRlsContext } from '../auth/rls-context.middleware'
import { calculateCompatibilityScores, getCollectionFormulaMotifs } from './service'

const app = new Hono<AppEnv>()

app.use('*', requireJwtAuth)
app.use('*', requireNotBanned)
app.use('*', withRlsContext)

export const collectionRoutes = app
  .post(
    '/compatibility-scores',
    zValidator('json', compatibilityScoresRequestSchema),
    async (c) => {
      const db = c.get('db')
      const userId = getAuthedUserId(c)
      const { productIds } = c.req.valid('json')
      const scores = await calculateCompatibilityScores(userId, productIds, db)
      return c.json(ok({ scores }), HTTP_STATUS.OK)
    }
  )
  .get('/formula-motifs', async (c) => {
    const db = c.get('db')
    const userId = getAuthedUserId(c)
    const motifs = await getCollectionFormulaMotifs(userId, db)
    return c.json(ok(motifs), HTTP_STATUS.OK)
  })
