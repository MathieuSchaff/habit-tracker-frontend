import { err, HTTP_STATUS, ok } from '@aurore/shared'

import { type Context, Hono, type Next } from 'hono'
import { z } from 'zod'

import type { AppEnv } from '../../app-env'
import { zValidator } from '../../utils/validator'
import { verifyAccessToken } from '../auth/jwt.utils'
import { withRlsContext } from '../auth/rls-context.middleware'
import { computeProductDermoScore } from './service'

// Populates userId/role when a valid bearer is present; falls through anonymously otherwise.
// Allows personalized dermo score on a public endpoint without requiring authentication.
const optionalJwtAuth = async (c: Context<AppEnv>, next: Next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return next()

  const token = authHeader.substring(7)
  const payload = await verifyAccessToken(token, c.get('jwtSecret'))
  if (payload) {
    c.set('userId', payload.sub)
    c.set('userRole', payload.role)
  }
  return next()
}

const slugParam = z.object({ slug: z.string().min(1).max(200) })

const app = new Hono<AppEnv>()
app.use('*', optionalJwtAuth)
app.use('*', withRlsContext)

export const dermoScoreRoutes = app.get(
  '/:slug/dermo-score',
  zValidator('param', slugParam),
  async (c) => {
    const database = c.get('db')
    const userId = c.get('userId') ?? null
    const { slug } = c.req.valid('param')

    const outcome = await computeProductDermoScore(slug, userId, database)
    if (!outcome.ok) {
      return c.json(err(outcome.reason), HTTP_STATUS.BAD_REQUEST)
    }
    return c.json(ok(outcome.assessment), HTTP_STATUS.OK)
  }
)
