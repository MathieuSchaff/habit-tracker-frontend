import { err, HTTP_STATUS, ok } from '@habit-tracker/shared'

import { zValidator } from '@hono/zod-validator'
import { type Context, Hono, type Next } from 'hono'
import { z } from 'zod'

import type { AppEnv } from '../../app-env'
import { verifyAccessToken } from '../auth/jwt.utils'
import { withRlsContext } from '../auth/rls-context.middleware'
import { computeProductDermoScore } from './service'

// Optional JWT auth: populate userId/role if a valid bearer is provided,
// otherwise let the request through anonymously. Used by public reads that
// still benefit from a logged-in profile (here: personalized dermo score).
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
    const userId = (c.get('userId') as string | undefined) ?? null
    const { slug } = c.req.valid('param')

    const outcome = await computeProductDermoScore(slug, userId, database)
    if (!outcome.ok) {
      return c.json(err(outcome.reason), HTTP_STATUS.BAD_REQUEST)
    }
    return c.json(ok(outcome.assessment), HTTP_STATUS.OK)
  }
)
