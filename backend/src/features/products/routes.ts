import {
  createProductSchema,
  err,
  errorResponse,
  errorToStatus,
  HTTP_STATUS,
  ok,
  productErrorMapping,
  productResponseSchema,
  productsPageSchema,
  successResponse,
  updateProductSchema,
} from '@habit-tracker/shared'

import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'

import type { AppEnv } from '../../app-env'
import { requireJwtAuth } from '../auth/middleware'
import { ProductError } from './product-error'
import {
  createProduct,
  deleteProduct,
  getProductBySlug,
  listProducts,
  updateProduct,
} from './service'

const slugParam = z.object({ slug: z.string().min(1).max(100) })
const idParam = z.object({ id: z.uuid() })
const nullData = z.null()

const listProductsQuery = z.object({
  kind: z.string().optional(),
  brand: z.string().optional(),
  tag: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

const listProductsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Products'],
  summary: 'List products with optional filters',
  request: { query: listProductsQuery },
  responses: {
    [HTTP_STATUS.OK]: successResponse(productsPageSchema, 'Products retrieved'),
  },
})

const createProductRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Products'],
  summary: 'Create a new product',
  security: [{ Bearer: [] }],
  request: {
    body: { content: { 'application/json': { schema: createProductSchema } } },
  },
  responses: {
    [HTTP_STATUS.CREATED]: successResponse(productResponseSchema, 'Product created'),
    [HTTP_STATUS.UNAUTHORIZED]: errorResponse('Not authenticated'),
    [HTTP_STATUS.BAD_REQUEST]: errorResponse('Validation error'),
    [HTTP_STATUS.CONFLICT]: errorResponse('Product already exists'),
  },
})

const getProductRoute = createRoute({
  method: 'get',
  path: '/{slug}',
  tags: ['Products'],
  summary: 'Get a product by slug',
  request: { params: slugParam },
  responses: {
    [HTTP_STATUS.OK]: successResponse(productResponseSchema, 'Product retrieved'),
    [HTTP_STATUS.NOT_FOUND]: errorResponse('Product not found'),
  },
})

const updateProductRoute = createRoute({
  method: 'patch',
  path: '/{id}',
  tags: ['Products'],
  summary: 'Update a product',
  security: [{ Bearer: [] }],
  request: {
    params: idParam,
    body: { content: { 'application/json': { schema: updateProductSchema } } },
  },
  responses: {
    [HTTP_STATUS.OK]: successResponse(productResponseSchema, 'Product updated'),
    [HTTP_STATUS.NOT_FOUND]: errorResponse('Product not found'),
    [HTTP_STATUS.UNAUTHORIZED]: errorResponse('Not authenticated'),
    [HTTP_STATUS.BAD_REQUEST]: errorResponse('Validation error'),
    [HTTP_STATUS.CONFLICT]: errorResponse('Product already exists'),
  },
})

const deleteProductRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  tags: ['Products'],
  summary: 'Delete a product',
  security: [{ Bearer: [] }],
  request: { params: idParam },
  responses: {
    [HTTP_STATUS.OK]: successResponse(nullData, 'Product deleted'),
    [HTTP_STATUS.NOT_FOUND]: errorResponse('Product not found'),
    [HTTP_STATUS.UNAUTHORIZED]: errorResponse('Not authenticated'),
  },
})

// App

const productsApp = new OpenAPIHono<AppEnv>()

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

  .openapi(listProductsRoute, async (c) => {
    const db = c.get('db')
    const { kind, brand, tag, page, limit } = c.req.valid('query')
    const result = await listProducts({ kind, brand, tag, page, limit }, db)
    return c.json(ok(result), HTTP_STATUS.OK)
  })

  .openapi(createProductRoute, async (c) => {
    const db = c.get('db')
    const userId = c.get('userId')
    const input = c.req.valid('json')
    const product = await createProduct(userId, input, db)
    return c.json(ok(product), HTTP_STATUS.CREATED)
  })

  .openapi(getProductRoute, async (c) => {
    const db = c.get('db')
    const { slug } = c.req.valid('param')
    const product = await getProductBySlug(slug, db)
    return c.json(ok(product), HTTP_STATUS.OK)
  })

  .openapi(updateProductRoute, async (c) => {
    const db = c.get('db')
    const { id } = c.req.valid('param')
    const userId = c.get('userId')
    const input = c.req.valid('json')
    const product = await updateProduct(userId, id, input, undefined, db)
    return c.json(ok(product), HTTP_STATUS.OK)
  })

  .openapi(deleteProductRoute, async (c) => {
    const db = c.get('db')
    const { id } = c.req.valid('param')
    await deleteProduct(id, db)
    return c.json(ok(null), HTTP_STATUS.OK)
  })
