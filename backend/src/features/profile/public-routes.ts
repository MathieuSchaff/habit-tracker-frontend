import { err, HTTP_STATUS, ok, USERNAME_MAX_LENGTH } from '@aurore/shared'

import { Hono } from 'hono'
import { z } from 'zod'

import type { AppEnv } from '../../app-env'
import { zValidator } from '../../utils/validator'
import { optionalJwtAuth } from '../auth/middleware'
import { withRlsContext } from '../auth/rls-context.middleware'
import { listPostsByAuthor } from '../social/posts.service'
import { listPublicReviewsByUser } from '../user-products/service'
import { getPublicProfileByUsername } from './service'

const usernameParam = z.object({
  username: z.string().trim().min(1).max(USERNAME_MAX_LENGTH),
})

const app = new Hono<AppEnv>()

// Anonymous reads allowed; optionalJwtAuth populates identity when present so
// withRlsContext can bind app_runtime for logged-in callers (defense-in-depth
// the service projection is the primary gate).
app.use('*', optionalJwtAuth)
app.use('*', withRlsContext)

export const publicProfileRoutes = app
  .get('/:username/public', zValidator('param', usernameParam), async (c) => {
    const db = c.get('db')
    const { username } = c.req.valid('param')
    const view = await getPublicProfileByUsername(db, username)
    if (!view) return c.json(err('not_found'), HTTP_STATUS.NOT_FOUND)
    return c.json(ok(view), HTTP_STATUS.OK)
  })
  // Recent public reviews sample for the porte-produits profile (#7/T4). The
  // service gards collapse unknown/non-public users to an empty list (anti-enum:
  // same shape as a public user with no reviews).
  .get('/:username/reviews', zValidator('param', usernameParam), async (c) => {
    const db = c.get('db')
    const { username } = c.req.valid('param')
    const reviews = await listPublicReviewsByUser(db, username)
    return c.json(ok(reviews), HTTP_STATUS.OK)
  })
  // Recent posts sample for the porte-produits profile (#7/T5). Same anti-enum
  // master gate as the reviews trail: unknown/non-public users collapse to [].
  .get('/:username/posts', zValidator('param', usernameParam), async (c) => {
    const db = c.get('db')
    const { username } = c.req.valid('param')
    const posts = await listPostsByAuthor(db, username)
    return c.json(ok(posts), HTTP_STATUS.OK)
  })
