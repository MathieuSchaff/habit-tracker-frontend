import {
  createProductSchema,
  HTTP_STATUS,
  ok,
  PRODUCT_DOMAIN_TABS,
  searchProductsQuery,
  skincareListProductsQuery,
  updateProductSchema,
} from '@habit-tracker/shared'

import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import type { AppEnv } from '../../app-env'
import { requireJwtAuth } from '../auth/middleware'
import { withRlsContext } from '../auth/rls-context.middleware'
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

const productsApp = new Hono<AppEnv>()

productsApp.use('*', async (c, next) => {
  if (c.req.method === 'GET') return next()
  return requireJwtAuth(c, next)
})
productsApp.use('*', withRlsContext)

export const productRoutes = productsApp

  .get(
    '/filter-options',
    zValidator('query', z.object({ category: z.enum(PRODUCT_DOMAIN_TABS).optional() })),
    async (c) => {
      const db = c.get('db')
      const { category } = c.req.valid('query')
      const options = await getFilterOptions(db, category)
      return c.json(ok(options), HTTP_STATUS.OK)
    }
  )
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
  .get('/', zValidator('query', skincareListProductsQuery), async (c) => {
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
