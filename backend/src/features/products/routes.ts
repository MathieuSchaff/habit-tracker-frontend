import {
  createProductSchema,
  HTTP_STATUS,
  listProductsQuery,
  ok,
  PRODUCT_DOMAIN_TABS,
  productsByIdsQuery,
  searchProductsQuery,
  updateProductSchema,
  verifyQualityBodySchema,
} from '@aurore/shared'

import { Hono } from 'hono'
import { z } from 'zod'

import type { AppEnv } from '../../app-env'
import { stripAdminFields } from '../../lib/catalog'
import { zValidator } from '../../utils/validator'
import {
  getAuthedUserId,
  getAuthedUserRole,
  optionalJwtAuth,
  requireAdmin,
  requireCatalogWrite,
  requireJwtAuth,
  requireNotBanned,
  requireNotBannedScope,
} from '../auth/middleware'
import { withRlsContext } from '../auth/rls-context.middleware'
import { securityScan } from '../security/security.middleware'
import { listPublicReviewsForProduct } from '../user-products/service'
import {
  createProduct,
  deleteProduct,
  findSimilarProducts,
  getDistinctBrands,
  getFilterOptions,
  getProductFullBySlug,
  getProductsByIds,
  listProducts,
  previewSlug,
  searchProducts,
  updateProduct,
  verifyProduct,
} from './service'

const slugParam = z.object({ slug: z.string().min(1).max(100) })
const idParam = z.object({ id: z.uuid() })

const checkDuplicateQuery = z.object({
  name: z.string().trim().min(2).max(200),
  brand: z.string().trim().min(1).max(200),
})

const slugPreviewQuery = z.object({
  name: z.string().trim().min(2).max(200),
  brand: z.string().trim().max(200).default(''),
})

const productsApp = new Hono<AppEnv>()

// One guard per use(): nesting swallows the short-circuit 403 → "Context not finalized" 500.
productsApp.use('*', async (c, next) => {
  return c.req.method === 'GET' ? optionalJwtAuth(c, next) : requireJwtAuth(c, next)
})
productsApp.use('*', async (c, next) => {
  return c.req.method === 'GET' ? next() : requireNotBanned(c, next)
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
  // Must precede /:slug or the slug route captures this path.
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
  .get('/slug-preview', requireJwtAuth, zValidator('query', slugPreviewQuery), async (c) => {
    const db = c.get('db')
    const { name, brand } = c.req.valid('query')
    const slug = await previewSlug(name, brand, db)
    return c.json(ok({ slug }), HTTP_STATUS.OK)
  })
  .get('/search', zValidator('query', searchProductsQuery), async (c) => {
    const db = c.get('db')
    const { q, limit, offset } = c.req.valid('query')
    const result = await searchProducts({ q, limit, offset }, db)
    return c.json(ok(result), HTTP_STATUS.OK)
  })
  .get('/by-ids', zValidator('query', productsByIdsQuery), async (c) => {
    const db = c.get('db')
    const { ids } = c.req.valid('query')
    const items = await getProductsByIds(ids, db)
    return c.json(ok(items), HTTP_STATUS.OK)
  })
  .get('/', zValidator('query', listProductsQuery), async (c) => {
    const db = c.get('db')
    const filters = c.req.valid('query')
    const userId = c.get('userId') ?? null

    const result = await listProducts(filters, db, userId)
    return c.json(ok(result), HTTP_STATUS.OK)
  })

  .post(
    '/',
    requireNotBannedScope('product_create'),
    securityScan(),
    zValidator('json', createProductSchema),
    async (c) => {
      const db = c.get('db')
      const userId = getAuthedUserId(c)
      const role = getAuthedUserRole(c)
      const input = c.req.valid('json')
      const product = await createProduct(userId, role, input, db)
      return c.json(ok(stripAdminFields(product)), HTTP_STATUS.CREATED)
    }
  )

  .get('/:slug', zValidator('param', slugParam), async (c) => {
    const db = c.get('db')
    const { slug } = c.req.valid('param')
    const product = await getProductFullBySlug(slug, db)
    return c.json(ok(product), HTTP_STATUS.OK)
  })

  .get('/:slug/reviews/public', zValidator('param', slugParam), async (c) => {
    const db = c.get('db')
    const { slug } = c.req.valid('param')
    const result = await listPublicReviewsForProduct(db, slug)
    return c.json(ok(result), HTTP_STATUS.OK)
  })

  .patch(
    '/:id',
    requireNotBannedScope('product_edit'),
    zValidator('param', idParam),
    securityScan(),
    zValidator('json', updateProductSchema),
    async (c) => {
      const db = c.get('db')
      const { id } = c.req.valid('param')
      const userId = getAuthedUserId(c)
      const input = c.req.valid('json')
      const product = await updateProduct(userId, id, input, undefined, db)
      return c.json(ok(stripAdminFields(product)), HTTP_STATUS.OK)
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
      const product = await verifyProduct(actorId, id, db)
      return c.json(ok(stripAdminFields(product)), HTTP_STATUS.OK)
    }
  )

  .delete(
    '/:id',
    requireNotBannedScope('product_edit'),
    requireAdmin,
    zValidator('param', idParam),
    async (c) => {
      const db = c.get('db')
      const role = getAuthedUserRole(c)
      const { id } = c.req.valid('param')
      await deleteProduct(db, role, id)
      return c.body(null, 204)
    }
  )
