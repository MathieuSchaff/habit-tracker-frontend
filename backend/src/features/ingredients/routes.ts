import {
  createIngredientSchema,
  HTTP_STATUS,
  INGREDIENT_TYPE_VALUES,
  listIngredientsSearchSchema,
  ok,
  updateIngredientRouteSchema,
  verifyQualityBodySchema,
} from '@habit-tracker/shared'

import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import type { AppEnv } from '../../app-env'
import { stripAdminFields } from '../../lib/catalog'
import {
  getAuthedUserId,
  getAuthedUserRole,
  requireAdmin,
  requireCatalogWrite,
  requireJwtAuth,
  requireNotBanned,
  requireNotBannedScope,
} from '../auth/middleware'
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
  listIngredientsBySlugs,
  searchIngredients,
  updateIngredient,
  verifyIngredient,
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

// Comma-separated slugs. Capped at 2000 chars so a stray client never seq-scans
// the table — handler splits + caps at 50 entries before hitting the DB.
const bySlugsQuery = z.object({
  slugs: z.string().min(1).max(2000),
})

const MAX_SLUG_LOOKUP = 50

const ingredientsApp = new Hono<AppEnv>()

// GET = anonymous OK. Non-GET = auth + ban-check. Split into two middleware so
// requireNotBanned's short-circuit 403 propagates back through Hono compose
// (see products/routes.ts for the same fix).
ingredientsApp.use('*', async (c, next) => {
  if (c.req.method === 'GET') return next()
  return requireJwtAuth(c, next)
})
ingredientsApp.use('*', async (c, next) => {
  if (c.req.method === 'GET') return next()
  return requireNotBanned(c, next)
})
ingredientsApp.use('*', withRlsContext)

export const ingredientRoutes = ingredientsApp

  .get('/search', zValidator('query', searchQuery), async (c) => {
    const db = c.get('db')
    const { q } = c.req.valid('query')

    const results = await searchIngredients(db, q)

    return c.json(ok(results), HTTP_STATUS.OK)
  })
  .get('/by-slugs', zValidator('query', bySlugsQuery), async (c) => {
    const db = c.get('db')
    const { slugs } = c.req.valid('query')
    const list = slugs.split(',').filter(Boolean).slice(0, MAX_SLUG_LOOKUP)
    const results = await listIngredientsBySlugs(db, list)
    return c.json(ok(results), HTTP_STATUS.OK)
  })
  .get(
    '/filter-options',
    zValidator('query', z.object({ type: z.enum(INGREDIENT_TYPE_VALUES).optional() })),
    async (c) => {
      const db = c.get('db')
      const { type } = c.req.valid('query')
      const options = await getIngredientFilterOptions(db, type)
      return c.json(ok(options), HTTP_STATUS.OK)
    }
  )
  .get('/options', async (c) => {
    const db = c.get('db')
    const items = await listAllIngredientOptions(db)
    return c.json(ok(items), HTTP_STATUS.OK)
  })
  .get('/', zValidator('query', listIngredientsSearchSchema), async (c) => {
    const db = c.get('db')
    const query = c.req.valid('query')
    const { items, total } = await listIngredients(db, query)
    return c.json(ok({ items, total }), HTTP_STATUS.OK)
  })

  .post(
    '/',
    requireNotBannedScope('ingredient_create'),
    zValidator('json', createIngredientSchema),
    async (c) => {
      const db = c.get('db')
      const userId = getAuthedUserId(c)
      const role = getAuthedUserRole(c)
      const input = c.req.valid('json')

      const ingredient = await createIngredient(db, userId, role, input)

      return c.json(ok(stripAdminFields(ingredient)), HTTP_STATUS.CREATED)
    }
  )

  .get('/:slug', zValidator('param', slugParam), async (c) => {
    const db = c.get('db')
    const { slug } = c.req.valid('param')

    const ingredient = await getIngredientBySlug(db, slug)

    return c.json(ok(stripAdminFields(ingredient)), HTTP_STATUS.OK)
  })

  .patch(
    '/:id',
    requireNotBannedScope('ingredient_edit'),
    zValidator('param', idParam),
    zValidator('json', updateIngredientRouteSchema),
    async (c) => {
      const db = c.get('db')
      const { id } = c.req.valid('param')
      const userId = getAuthedUserId(c)
      const { expectedUpdatedAt, summary, ...data } = c.req.valid('json')
      const ingredient = await updateIngredient(db, userId, id, data, summary, expectedUpdatedAt)
      return c.json(ok(stripAdminFields(ingredient)), HTTP_STATUS.OK)
    }
  )
  .patch(
    '/:id/quality',
    requireCatalogWrite,
    zValidator('param', idParam),
    zValidator('json', verifyQualityBodySchema),
    async (c) => {
      const db = c.get('db')
      const { id } = c.req.valid('param')
      const actorId = getAuthedUserId(c)
      const ingredient = await verifyIngredient(db, actorId, id)
      return c.json(ok(stripAdminFields(ingredient)), HTTP_STATUS.OK)
    }
  )
  .delete(
    '/:id',
    requireNotBannedScope('ingredient_edit'),
    requireAdmin,
    zValidator('param', idParam),
    async (c) => {
      const db = c.get('db')
      const role = getAuthedUserRole(c)
      const { id } = c.req.valid('param')
      await deleteIngredient(db, role, id)
      return c.body(null, 204)
    }
  )

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
