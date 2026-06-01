import { createSuggestedEditBodySchema, HTTP_STATUS, ok } from '@aurore/shared'

import { Hono } from 'hono'

import type { AppEnv } from '../../app-env'
import { rateLimiterFunc } from '../../utils/rateLimiter'
import { zValidator } from '../../utils/validator'
import { getAuthedUserId, requireJwtAuth, requireNotBanned } from '../auth/middleware'
import { withRlsContext } from '../auth/rls-context.middleware'
import { createSuggestedEdit } from './service'

const app = new Hono<AppEnv>()

app.use('*', rateLimiterFunc)
app.use('*', requireJwtAuth)
app.use('*', requireNotBanned)
app.use('*', withRlsContext)

export const suggestedEditsRoutes = app.post(
  '/',
  zValidator('json', createSuggestedEditBodySchema),
  async (c) => {
    const proposerId = getAuthedUserId(c)
    const body = c.req.valid('json')
    const edit = await createSuggestedEdit(c.get('db'), { proposerId, body })
    return c.json(ok(edit), HTTP_STATUS.CREATED)
  }
)
