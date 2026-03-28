import {
  createProductSchema,
  err,
  errorToStatus,
  HTTP_STATUS,
  ok,
  productErrorMapping,
  searchProductsQuery,
  updateProductSchema,
} from '@habit-tracker/shared'

import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import type { AppEnv } from '../../app-env'
import { requireJwtAuth } from '../auth/middleware'
import { ProductError } from './product-error'
import {
  createProduct,
  deleteProduct,
  findSimilarProducts,
  getDistinctBrands,
  getFilterOptions,
  getProductWithIngredientsBySlug,
  listProducts,
  searchProducts,
  updateProduct,
} from './service'

const slugParam = z.object({ slug: z.string().min(1).max(100) })
const idParam = z.object({ id: z.uuid() })

const checkDuplicateQuery = z.object({
  name: z.string().trim().min(2).max(200),
  brand: z.string().trim().min(1).max(200),
})

const listProductsQuery = z.object({
  kind: z.string().optional(),
  brand: z.string().optional(),
  routine_step: z.string().optional(),
  attribute: z.string().optional(),
  skin_type: z.string().optional(),
  concern: z.string().optional(),
  product_type: z.string().optional(),
  ingredient: z.string().optional(),
  skin_zone: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

const productsApp = new Hono<AppEnv>()

productsApp.use('*', async (c, next) => {
  if (c.req.method === 'GET') return next()
  return requireJwtAuth(c, next)
})

productsApp.onError((error, c) => {
  if (error instanceof ProductError) {
    return c.json(err(error.code, error.details), errorToStatus(error.code, productErrorMapping))
  }
  console.error('Unexpected error:', error)
  return c.json(err('server_error'), HTTP_STATUS.INTERNAL_SERVER_ERROR)
})

export const productRoutes = productsApp

  .get('/filter-options', async (c) => {
    const db = c.get('db')
    const options = await getFilterOptions(db)
    return c.json(ok(options), HTTP_STATUS.OK)
  })
  // I put this route here because if I put it below, the slug route will take the request
  .get('/brands', async (c) => {
    const db = c.get('db')
    const brands = await getDistinctBrands(db)
    return c.json(ok(brands), HTTP_STATUS.OK)
  })
  .get('/check-duplicate', zValidator('query', checkDuplicateQuery), async (c) => {
    const db = c.get('db')
    const { name, brand } = c.req.valid('query')
    const similar = await findSimilarProducts(name, brand, db)
    return c.json(ok(similar), HTTP_STATUS.OK)
  })
  .get('/search', zValidator('query', searchProductsQuery), async (c) => {
    const db = c.get('db')
    const { q, limit } = c.req.valid('query')
    const result = await searchProducts({ q, limit }, db)
    return c.json(ok(result), HTTP_STATUS.OK)
  })
  .get('/', zValidator('query', listProductsQuery), async (c) => {
    const db = c.get('db')
    const filters = c.req.valid('query')

    const result = await listProducts(filters, db)
    return c.json(ok(result), HTTP_STATUS.OK)
  })

  .post('/', zValidator('json', createProductSchema), async (c) => {
    const db = c.get('db')
    const userId = c.get('userId')
    const input = c.req.valid('json')
    const product = await createProduct(userId, input, db)
    return c.json(ok(product), HTTP_STATUS.CREATED)
  })

  .get('/:slug', zValidator('param', slugParam), async (c) => {
    const db = c.get('db')
    const { slug } = c.req.valid('param')
    const product = await getProductWithIngredientsBySlug(slug, db)
    return c.json(ok(product), HTTP_STATUS.OK)
  })

  .patch(
    '/:id',
    zValidator('param', idParam),
    zValidator('json', updateProductSchema),
    async (c) => {
      const db = c.get('db')
      const { id } = c.req.valid('param')
      const userId = c.get('userId')
      const input = c.req.valid('json')
      const product = await updateProduct(userId, id, input, undefined, db)
      return c.json(ok(product), HTTP_STATUS.OK)
    }
  )

  .delete('/:id', zValidator('param', idParam), async (c) => {
    const db = c.get('db')
    const { id } = c.req.valid('param')
    await deleteProduct(id, db)
    return c.body(null, 204)
  })
