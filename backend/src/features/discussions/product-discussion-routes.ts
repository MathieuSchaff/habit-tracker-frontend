import { createReplySchema, createThreadSchema, HTTP_STATUS, ok } from '@habit-tracker/shared'

import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import type { AppEnv } from '../../app-env'
import { requireJwtAuth } from '../auth/middleware'
import { withRlsContext } from '../auth/rls-context.middleware'
import {
  createReply,
  createThread,
  deleteReply,
  deleteThread,
  getThreadWithReplies,
  listThreads,
} from './service'

const slugParam = z.object({ slug: z.string().min(1).max(100) })
const threadParam = z.object({ slug: z.string().min(1).max(100), threadId: z.uuid() })
const replyParam = z.object({
  slug: z.string().min(1).max(100),
  threadId: z.uuid(),
  replyId: z.uuid(),
})

const app = new Hono<AppEnv>()

// GET routes are public; write routes require auth
app.use('*', async (c, next) => {
  if (c.req.method === 'GET') return next()
  return requireJwtAuth(c, next)
})
app.use('*', withRlsContext)

export const productDiscussionRoutes = app
  .get('/:slug/discussions', zValidator('param', slugParam), async (c) => {
    const db = c.get('db')
    const { slug } = c.req.valid('param')
    const threads = await listThreads(slug, 'product', db)
    return c.json(ok(threads), HTTP_STATUS.OK)
  })

  .post(
    '/:slug/discussions',
    zValidator('param', slugParam),
    zValidator('json', createThreadSchema),
    async (c) => {
      const db = c.get('db')
      const userId = c.get('userId')
      const { slug } = c.req.valid('param')
      const input = c.req.valid('json')
      const thread = await createThread(userId, slug, 'product', input, db)
      return c.json(ok(thread), HTTP_STATUS.CREATED)
    }
  )

  .get('/:slug/discussions/:threadId', zValidator('param', threadParam), async (c) => {
    const db = c.get('db')
    const { threadId } = c.req.valid('param')
    const thread = await getThreadWithReplies(threadId, db)
    return c.json(ok(thread), HTTP_STATUS.OK)
  })

  .delete('/:slug/discussions/:threadId', zValidator('param', threadParam), async (c) => {
    const db = c.get('db')
    const userId = c.get('userId')
    const { threadId } = c.req.valid('param')
    await deleteThread(userId, threadId, db)
    return c.body(null, 204)
  })

  .post(
    '/:slug/discussions/:threadId/replies',
    zValidator('param', threadParam),
    zValidator('json', createReplySchema),
    async (c) => {
      const db = c.get('db')
      const userId = c.get('userId')
      const { threadId } = c.req.valid('param')
      const input = c.req.valid('json')
      const reply = await createReply(userId, threadId, input, db)
      return c.json(ok(reply), HTTP_STATUS.CREATED)
    }
  )

  .delete(
    '/:slug/discussions/:threadId/replies/:replyId',
    zValidator('param', replyParam),
    async (c) => {
      const db = c.get('db')
      const userId = c.get('userId')
      const { replyId } = c.req.valid('param')
      await deleteReply(userId, replyId, db)
      return c.body(null, 204)
    }
  )
