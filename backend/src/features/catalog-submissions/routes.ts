import { HTTP_STATUS, ok } from '@aurore/shared'

import { Hono } from 'hono'

import type { AppEnv } from '../../app-env'
import { rateLimiterFunc } from '../../utils/rateLimiter'
import { getAuthedUserId, requireJwtAuth, requireNotBanned } from '../auth/middleware'
import { getMySubmissions } from './service'

// No withRlsContext here: getMySubmissions intentionally reads via withAdminRls to
// bypass the select_visible policy and surface the owner's own hidden rows. Adding
// withRlsContext would nest the two and make the role-setting order fragile.
const app = new Hono<AppEnv>()

app.use('*', rateLimiterFunc)
app.use('*', requireJwtAuth)
app.use('*', requireNotBanned)

export const meRoutes = app.get('/submissions', async (c) => {
  const userId = getAuthedUserId(c)
  const result = await getMySubmissions(userId)
  return c.json(ok(result), HTTP_STATUS.OK)
})
