import { err, HTTP_STATUS, ok, USERNAME_MAX_LENGTH } from '@habit-tracker/shared'

import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import type { AppEnv } from '../../app-env'
import { optionalJwtAuth } from '../auth/middleware'
import { withRlsContext } from '../auth/rls-context.middleware'
import { getPublicProfileByUsername } from './service'

const usernameParam = z.object({
  username: z.string().trim().min(1).max(USERNAME_MAX_LENGTH),
})

const app = new Hono<AppEnv>()

// Anonymous reads allowed; optionalJwtAuth populates identity when present so
// withRlsContext can bind app_runtime for logged-in callers (defense-in-depth
// — the service projection is the primary gate).
app.use('*', optionalJwtAuth)
app.use('*', withRlsContext)

export const publicProfileRoutes = app.get(
  '/:username/public',
  zValidator('param', usernameParam),
  async (c) => {
    const db = c.get('db')
    const { username } = c.req.valid('param')
    const view = await getPublicProfileByUsername(db, username)
    if (!view) return c.json(err('not_found'), HTTP_STATUS.NOT_FOUND)
    return c.json(ok(view), HTTP_STATUS.OK)
  }
)
