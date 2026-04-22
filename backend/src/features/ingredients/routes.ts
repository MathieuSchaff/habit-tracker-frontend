import {
  createIngredientSchema,
  HTTP_STATUS,
  ok,
  skincareIngredientsSearchSchema,
  updateIngredientRouteSchema,
} from '@habit-tracker/shared'

import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import type { AppEnv } from '../../app-env'
import { requireJwtAuth } from '../auth/middleware'
import { withRlsContext } from '../auth/rls-context.middleware'
import { listProductsByIngredient } from '../products/product-ingredients/product-ingredients.service'
import {
  createIngredient,
  deleteIngredient,
  getIngredientBySlug,
  getIngredientFilterOptions,
  listAllIngredientOptions,
  listIngredientEdits,
  listIngredients,
  searchIngredients,
  updateIngredient,
} from './service'

const slugParam = z.object({
  slug: z.string().min(1).max(100),
})

const idParam = z.object({
  id: z.uuid(),
})

const searchQuery = z.object({
  q: z.string().min(1).max(100),
})

const ingredientsApp = new Hono<AppEnv>()

// For ingredients, I let people look at them (GET) without asking who they are.
// but if they want to create or change something, they must login first.
ingredientsApp.use('*', async (c, next) => {
  if (c.req.method === 'GET') return next()
  return requireJwtAuth(c, next)
})
ingredientsApp.use('*', withRlsContext)

export const ingredientRoutes = ingredientsApp

  .get('/search', zValidator('query', searchQuery), async (c) => {
    const db = c.get('db')
    const { q } = c.req.valid('query')

    const results = await searchIngredients(db, q)

    return c.json(ok(results), HTTP_STATUS.OK)
  })
  .get('/filter-options', async (c) => {
    const db = c.get('db')
    const options = await getIngredientFilterOptions(db)
    return c.json(ok(options), HTTP_STATUS.OK)
  })
  .get('/options', async (c) => {
    const db = c.get('db')
    const items = await listAllIngredientOptions(db)
    return c.json(ok(items), HTTP_STATUS.OK)
  })
  .get('/', zValidator('query', skincareIngredientsSearchSchema), async (c) => {
    const db = c.get('db')
    const query = c.req.valid('query')
    const { items, total } = await listIngredients(db, query)
    return c.json(ok({ items, total }), HTTP_STATUS.OK)
  })

  .post('/', zValidator('json', createIngredientSchema), async (c) => {
    const db = c.get('db')
    const userId = c.get('userId')
    const input = c.req.valid('json')

    const ingredient = await createIngredient(db, userId, input)

    return c.json(ok(ingredient), HTTP_STATUS.CREATED)
  })

  .get('/:slug', zValidator('param', slugParam), async (c) => {
    const db = c.get('db')
    const { slug } = c.req.valid('param')

    const ingredient = await getIngredientBySlug(db, slug)

    return c.json(ok(ingredient), HTTP_STATUS.OK)
  })

  .patch(
    '/:id',
    zValidator('param', idParam),
    zValidator('json', updateIngredientRouteSchema),
    async (c) => {
      const db = c.get('db')
      const { id } = c.req.valid('param')
      const userId = c.get('userId')
      const { expectedUpdatedAt, summary, ...data } = c.req.valid('json')
      const ingredient = await updateIngredient(db, userId, id, data, summary, expectedUpdatedAt)
      return c.json(ok(ingredient), HTTP_STATUS.OK)
    }
  )
  .delete('/:id', zValidator('param', idParam), async (c) => {
    const db = c.get('db')
    const { id } = c.req.valid('param')
    await deleteIngredient(db, id)
    return c.body(null, 204)
  })

  .get('/:slug/edits', zValidator('param', slugParam), async (c) => {
    const db = c.get('db')
    const { slug } = c.req.valid('param')

    const ingredient = await getIngredientBySlug(db, slug)
    const edits = await listIngredientEdits(db, ingredient.id)

    return c.json(ok(edits), HTTP_STATUS.OK)
  })

  .get('/:slug/products', zValidator('param', slugParam), async (c) => {
    const db = c.get('db')
    const { slug } = c.req.valid('param')

    const ingredient = await getIngredientBySlug(db, slug)

    const items = await listProductsByIngredient(db, ingredient.id)

    return c.json(ok(items), HTTP_STATUS.OK)
  })
