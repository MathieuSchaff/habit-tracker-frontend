import {
  articleSearchSchema,
  createArticleSchema,
  err,
  HTTP_STATUS,
  ok,
  updateArticleSchema,
} from '@habit-tracker/shared'

import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import type { AppEnv } from '../../app-env'
import { requireJwtAuth } from '../auth/middleware'
import {
  createArticle,
  deleteArticle,
  getArticleBySlug,
  listArticles,
  updateArticle,
} from './service'

const slugParam = z.object({ slug: z.string().min(1).max(150) })

const articlesApp = new Hono<AppEnv>()

articlesApp.use('*', async (c, next) => {
  if (c.req.method === 'GET') return next()
  return requireJwtAuth(c, next)
})

export const articleRoutes = articlesApp
  .get('/', zValidator('query', articleSearchSchema), async (c) => {
    const db = c.get('db')
    const query = c.req.valid('query')
    const isAdmin = c.get('userRole') === 'admin'
    const { items, total } = await listArticles(db, query, isAdmin)
    return c.json(ok({ items, total }), HTTP_STATUS.OK)
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
    const userId = c.get('userId')
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
