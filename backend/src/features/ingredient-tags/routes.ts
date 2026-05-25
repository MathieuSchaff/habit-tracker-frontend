import { createTagSchema, HTTP_STATUS, ok, updateTagSchema } from '@habit-tracker/shared'

import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import type { AppEnv } from '../../app-env'
import { requireAdmin, requireJwtAuth, requireNotBanned } from '../auth/middleware'
import { withRlsContext } from '../auth/rls-context.middleware'
import { TagError } from '../product-tags/tag-error'
import {
  createIngredientTag,
  deleteIngredientTag,
  getIngredientTagById,
  getIngredientTagBySlug,
  listIngredientsByTag,
  listIngredientTags,
  updateIngredientTag,
} from './service'

const idParam = z.object({ id: z.uuid() })
const slugParam = z.object({ slug: z.string().min(1).max(100) })

const listTagsQuery = z.object({
  category: z.string().optional(),
})

const ingredientTagsApp = new Hono<AppEnv>()

ingredientTagsApp.use('*', async (c, next) => {
  if (c.req.method === 'GET') return next()
  return requireJwtAuth(c, async () => {
    await requireNotBanned(c, next)
  })
})
ingredientTagsApp.use('*', async (c, next) => {
  if (c.req.method === 'GET') return next()
  return requireAdmin(c, next)
})
ingredientTagsApp.use('*', withRlsContext)

export const ingredientTagDefRoutes = ingredientTagsApp

  .get('/', zValidator('query', listTagsQuery), async (c) => {
    const db = c.get('db')
    const query = c.req.valid('query')
    const tags = await listIngredientTags(db, query)
    return c.json(ok(tags), HTTP_STATUS.OK)
  })

  .post('/', zValidator('json', createTagSchema), async (c) => {
    const db = c.get('db')
    const input = c.req.valid('json')
    const tag = await createIngredientTag(db, input)
    return c.json(ok(tag), HTTP_STATUS.CREATED)
  })

  .get('/:id', zValidator('param', idParam), async (c) => {
    const db = c.get('db')
    const { id } = c.req.valid('param')
    const tag = await getIngredientTagById(db, id)
    if (!tag) throw new TagError('tag_not_found')
    return c.json(ok(tag), HTTP_STATUS.OK)
  })

  .patch('/:id', zValidator('param', idParam), zValidator('json', updateTagSchema), async (c) => {
    const db = c.get('db')
    const { id } = c.req.valid('param')
    const input = c.req.valid('json')
    const tag = await updateIngredientTag(db, id, input)
    return c.json(ok(tag), HTTP_STATUS.OK)
  })

  .delete('/:id', zValidator('param', idParam), async (c) => {
    const db = c.get('db')
    const { id } = c.req.valid('param')
    const deleted = await deleteIngredientTag(db, id)
    if (!deleted) throw new TagError('tag_not_found')
    return c.json(ok(null), HTTP_STATUS.OK)
  })

  .get('/:slug/ingredients', zValidator('param', slugParam), async (c) => {
    const db = c.get('db')
    const { slug } = c.req.valid('param')
    const tag = await getIngredientTagBySlug(db, slug)
    if (!tag) throw new TagError('tag_not_found')
    const items = await listIngredientsByTag(db, tag.id)
    return c.json(ok(items), HTTP_STATUS.OK)
  })
