import { HTTP_STATUS, ok } from '@aurore/shared'

import { Hono } from 'hono'

import type { AppEnv } from '../../app-env'
import { applyAuthedGuards } from '../auth/authed-guards'
import { getAuthedUserId } from '../auth/middleware'
import { getMySubmissions } from './service'

// getMySubmissions reads own hidden rows under the request RLS context (regular role plus
// the app.own_submissions flag it sets), so select_visible's owner clause scopes them to
// created_by at the DB layer.
const app = applyAuthedGuards(new Hono<AppEnv>())

export const meRoutes = app.get('/submissions', async (c) => {
  const userId = getAuthedUserId(c)
  const result = await getMySubmissions(c.get('db'), userId)
  return c.json(ok(result), HTTP_STATUS.OK)
})
