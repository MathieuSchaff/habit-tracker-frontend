import {
  articleSearchSchema,
  createArticleSchema,
  err,
  HTTP_STATUS,
  ok,
  updateArticleSchema,
} from '@aurore/shared'

import { Hono } from 'hono'
import { z } from 'zod'

import type { AppEnv } from '../../app-env'
import { zValidator } from '../../utils/validator'
import { getAuthedUserId, requireJwtAuth, requireNotBanned } from '../auth/middleware'
import {
  createArticle,
  deleteArticle,
  getArticleBySlug,
  getCategoryCounts,
  listArticles,
  updateArticle,
} from './service'

const slugParam = z.object({ slug: z.string().min(1).max(150) })

const articlesApp = new Hono<AppEnv>()

// One guard per use(): nesting swallows the short-circuit 403 → "Context not finalized" 500.
articlesApp.use('*', async (c, next) => {
  return c.req.method === 'GET' ? next() : requireJwtAuth(c, next)
})
articlesApp.use('*', async (c, next) => {
  return c.req.method === 'GET' ? next() : requireNotBanned(c, next)
})

export const articleRoutes = articlesApp
  .get('/', zValidator('query', articleSearchSchema), async (c) => {
    const db = c.get('db')
    const query = c.req.valid('query')
    const isAdmin = c.get('userRole') === 'admin'
    const { items, total } = await listArticles(db, query, isAdmin)
    return c.json(ok({ items, total }), HTTP_STATUS.OK)
  })

  .get('/categories', async (c) => {
    const db = c.get('db')
    const counts = await getCategoryCounts(db)
    return c.json(ok(counts), HTTP_STATUS.OK)
  })

  .get('/:slug', zValidator('param', slugParam), async (c) => {
    const db = c.get('db')
    const { slug } = c.req.valid('param')
    const article = await getArticleBySlug(db, slug)
    return c.json(ok(article), HTTP_STATUS.OK)
  })

  .post('/', zValidator('json', createArticleSchema), async (c) => {
    const db = c.get('db')
    if (c.get('userRole') !== 'admin')
      return c.json(err('unauthorized_access'), HTTP_STATUS.FORBIDDEN)
    const userId = getAuthedUserId(c)
    const input = c.req.valid('json')
    const article = await createArticle(db, userId, input)
    return c.json(ok(article), HTTP_STATUS.CREATED)
  })

  .patch(
    '/:slug',
    zValidator('param', slugParam),
    zValidator('json', updateArticleSchema),
    async (c) => {
      const db = c.get('db')
      if (c.get('userRole') !== 'admin')
        return c.json(err('unauthorized_access'), HTTP_STATUS.FORBIDDEN)
      const { slug } = c.req.valid('param')
      const input = c.req.valid('json')
      const article = await updateArticle(db, slug, input)
      return c.json(ok(article), HTTP_STATUS.OK)
    }
  )

  .delete('/:slug', zValidator('param', slugParam), async (c) => {
    const db = c.get('db')
    if (c.get('userRole') !== 'admin')
      return c.json(err('unauthorized_access'), HTTP_STATUS.FORBIDDEN)
    const { slug } = c.req.valid('param')
    await deleteArticle(db, slug)
    return c.body(null, 204)
  })
