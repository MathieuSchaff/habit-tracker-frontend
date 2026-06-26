import { createPostReplySchema, createPostSchema, HTTP_STATUS, ok } from '@aurore/shared'

import { Hono } from 'hono'
import { z } from 'zod'

import type { AppEnv } from '../../app-env'
import { zValidator } from '../../utils/validator'
import {
  getAuthedUserId,
  requireJwtAuth,
  requireNotBanned,
  requireNotBannedScope,
} from '../auth/middleware'
import { withRlsContext } from '../auth/rls-context.middleware'
import {
  createPost,
  createPostReply,
  deletePost,
  deletePostReply,
  getPostWithReplies,
} from './posts.service'

const postParam = z.object({ postId: z.uuid() })
const replyParam = z.object({ postId: z.uuid(), replyId: z.uuid() })

const app = new Hono<AppEnv>()

// GET = anonymous read OK. Non-GET = auth + ban. Split middleware so
// requireNotBanned's short-circuit 403 propagates through Hono compose.
app.use('*', async (c, next) => (c.req.method === 'GET' ? next() : requireJwtAuth(c, next)))
app.use('*', async (c, next) => (c.req.method === 'GET' ? next() : requireNotBanned(c, next)))
app.use('*', withRlsContext)

export const socialPostsRoutes = app
  .post(
    '/',
    requireNotBannedScope('social_post'),
    zValidator('json', createPostSchema),
    async (c) => {
      const db = c.get('db')
      const userId = getAuthedUserId(c)
      const post = await createPost(userId, c.req.valid('json'), db)
      return c.json(ok(post), HTTP_STATUS.CREATED)
    }
  )
  .get('/:postId', zValidator('param', postParam), async (c) => {
    const db = c.get('db')
    const { postId } = c.req.valid('param')
    const post = await getPostWithReplies(postId, db)
    return c.json(ok(post), HTTP_STATUS.OK)
  })
  .delete('/:postId', zValidator('param', postParam), async (c) => {
    const db = c.get('db')
    const userId = getAuthedUserId(c)
    const { postId } = c.req.valid('param')
    await deletePost(userId, postId, db)
    return c.body(null, 204)
  })
  .post(
    '/:postId/replies',
    requireNotBannedScope('social_post'),
    zValidator('param', postParam),
    zValidator('json', createPostReplySchema),
    async (c) => {
      const db = c.get('db')
      const userId = getAuthedUserId(c)
      const { postId } = c.req.valid('param')
      const reply = await createPostReply(userId, postId, c.req.valid('json'), db)
      return c.json(ok(reply), HTTP_STATUS.CREATED)
    }
  )
  .delete('/:postId/replies/:replyId', zValidator('param', replyParam), async (c) => {
    const db = c.get('db')
    const userId = getAuthedUserId(c)
    const { replyId } = c.req.valid('param')
    await deletePostReply(userId, replyId, db)
    return c.body(null, 204)
  })
