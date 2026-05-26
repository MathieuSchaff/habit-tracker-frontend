import {
  addIngredientTagSchema,
  HTTP_STATUS,
  ok,
  replaceIngredientTagsSchema,
} from '@habit-tracker/shared'

import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import type { AppEnv } from '../../../app-env'
import { isUniqueViolation } from '../../../lib/helpers'
import { requireAdmin, requireJwtAuth, requireNotBanned } from '../../auth/middleware'
import { withRlsContext } from '../../auth/rls-context.middleware'
import {
  addTagToIngredient,
  listTagsByIngredient,
  removeTagFromIngredient,
  replaceIngredientTags,
} from '../../ingredient-tags/service'
import { TagError } from '../../product-tags/tag-error'

const ingredientParams = z.object({ ingredientId: z.uuid() })
const ingredientTagParams = z.object({ ingredientId: z.uuid(), tagId: z.uuid() })

const ingredientTagsApp = new Hono<AppEnv>()

// One guard per use(): nesting swallows the short-circuit 403 → "Context not finalized" 500.
ingredientTagsApp.use('*', async (c, next) => {
  return c.req.method === 'GET' ? next() : requireJwtAuth(c, next)
})
ingredientTagsApp.use('*', async (c, next) => {
  return c.req.method === 'GET' ? next() : requireNotBanned(c, next)
})
ingredientTagsApp.use('*', withRlsContext)

export const ingredientTagRoutes = ingredientTagsApp

  .get('/:ingredientId/tags', zValidator('param', ingredientParams), async (c) => {
    const db = c.get('db')
    const { ingredientId } = c.req.valid('param')
    const items = await listTagsByIngredient(db, ingredientId)
    return c.json(ok(items), HTTP_STATUS.OK)
  })

  .post(
    '/:ingredientId/tags',
    requireAdmin,
    zValidator('param', ingredientParams),
    zValidator('json', addIngredientTagSchema),
    async (c) => {
      const db = c.get('db')
      const { ingredientId } = c.req.valid('param')
      const { tagId, relevance } = c.req.valid('json')

      try {
        const link = await addTagToIngredient(db, ingredientId, tagId, relevance)
        // If the database didn't give me the link back, it means something is broken inside.
        if (!link) throw new TagError('database_error')
        return c.json(ok(link), HTTP_STATUS.CREATED)
      } catch (e) {
        if (e instanceof TagError) throw e
        // If the user tries to add a tag that is already there, I tell them it's a conflict.
        if (isUniqueViolation(e)) throw new TagError('tag_already_exists')
        throw e
      }
    }
  )

  .delete(
    '/:ingredientId/tags/:tagId',
    requireAdmin,
    zValidator('param', ingredientTagParams),
    async (c) => {
      const db = c.get('db')
      const { ingredientId, tagId } = c.req.valid('param')
      const removed = await removeTagFromIngredient(db, ingredientId, tagId)
      // I check if I actually removed something. If not, maybe the tag was never there.
      if (!removed) throw new TagError('tag_not_found')
      return c.body(null, 204)
    }
  )

  .put(
    '/:ingredientId/tags',
    requireAdmin,
    zValidator('param', ingredientParams),
    zValidator('json', replaceIngredientTagsSchema),
    async (c) => {
      const db = c.get('db')
      const { ingredientId } = c.req.valid('param')
      const { tags } = c.req.valid('json')
      // Here I replace everything at once. It's easier than doing many small deletes and posts.
      const links = await replaceIngredientTags(db, ingredientId, tags)
      return c.json(ok(links), HTTP_STATUS.OK)
    }
  )
