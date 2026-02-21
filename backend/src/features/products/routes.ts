// import {
//   createProductPageSchema,
//   createProductSchema,
//   err,
//   errorResponse,
//   errorToStatus,
//   HTTP_STATUS,
//   ok,
//   productEntitySchema,
//   productErrorMapping,
//   productPageEntitySchema,
//   productStockEntitySchema,
//   productWithStockSchema,
//   successResponse,
//   updateProductPageSchema,
//   updateProductSchema,
//   updateStockSchema,
// } from '@habit-tracker/shared'

// import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'

// import type { AppEnv } from '../../app-env'
// import { requireJwtAuth } from '../auth/middleware'
// import { ProductError } from './product-error'
// import {
//   archiveProduct,
//   createProduct,
//   createProductPage,
//   deleteProduct,
//   deleteProductPage,
//   getAllProductPages,
//   getProductById,
//   getProductPageById,
//   getUserProducts,
//   restoreProduct,
//   updateProduct,
//   updateProductPage,
//   updateStock,
// } from './service'

// // Helpers

// const idParam = z.object({ id: z.string().uuid() })
// const nullData = z.null()

// // Product Page Route Definitions

// const listProductPagesRoute = createRoute({
//   method: 'get',
//   path: '/',
//   tags: ['Product Pages'],
//   summary: 'List all product pages',
//   security: [{ Bearer: [] }],
//   responses: {
//     [HTTP_STATUS.OK]: successResponse(z.array(productPageEntitySchema), 'Product pages retrieved'),
//     [HTTP_STATUS.UNAUTHORIZED]: errorResponse('Not authenticated'),
//   },
// })

// const createProductPageRoute = createRoute({
//   method: 'post',
//   path: '/',
//   tags: ['Product Pages'],
//   summary: 'Create a product page',
//   security: [{ Bearer: [] }],
//   request: {
//     body: { content: { 'application/json': { schema: createProductPageSchema } } },
//   },
//   responses: {
//     [HTTP_STATUS.CREATED]: successResponse(productPageEntitySchema, 'Product page created'),
//     [HTTP_STATUS.UNAUTHORIZED]: errorResponse('Not authenticated'),
//     [HTTP_STATUS.BAD_REQUEST]: errorResponse('Validation error'),
//   },
// })

// const getProductPageRoute = createRoute({
//   method: 'get',
//   path: '/{id}',
//   tags: ['Product Pages'],
//   summary: 'Get a product page by id',
//   security: [{ Bearer: [] }],
//   request: { params: idParam },
//   responses: {
//     [HTTP_STATUS.OK]: successResponse(productPageEntitySchema, 'Product page retrieved'),
//     [HTTP_STATUS.NOT_FOUND]: errorResponse('Product page not found'),
//     [HTTP_STATUS.UNAUTHORIZED]: errorResponse('Not authenticated'),
//   },
// })

// const updateProductPageRoute = createRoute({
//   method: 'patch',
//   path: '/{id}',
//   tags: ['Product Pages'],
//   summary: 'Update a product page',
//   security: [{ Bearer: [] }],
//   request: {
//     params: idParam,
//     body: { content: { 'application/json': { schema: updateProductPageSchema } } },
//   },
//   responses: {
//     [HTTP_STATUS.OK]: successResponse(productPageEntitySchema, 'Product page updated'),
//     [HTTP_STATUS.NOT_FOUND]: errorResponse('Product page not found'),
//     [HTTP_STATUS.UNAUTHORIZED]: errorResponse('Not authenticated'),
//     [HTTP_STATUS.BAD_REQUEST]: errorResponse('Validation error'),
//   },
// })

// const deleteProductPageRoute = createRoute({
//   method: 'delete',
//   path: '/{id}',
//   tags: ['Product Pages'],
//   summary: 'Delete a product page',
//   security: [{ Bearer: [] }],
//   request: { params: idParam },
//   responses: {
//     [HTTP_STATUS.OK]: successResponse(nullData, 'Product page deleted'),
//     [HTTP_STATUS.NOT_FOUND]: errorResponse('Product page not found'),
//     [HTTP_STATUS.UNAUTHORIZED]: errorResponse('Not authenticated'),
//   },
// })

// // Product Route Definitions

// const listProductsRoute = createRoute({
//   method: 'get',
//   path: '/',
//   tags: ['Products'],
//   summary: 'List user products',
//   security: [{ Bearer: [] }],
//   responses: {
//     [HTTP_STATUS.OK]: successResponse(z.array(productWithStockSchema), 'Products retrieved'),
//     [HTTP_STATUS.UNAUTHORIZED]: errorResponse('Not authenticated'),
//   },
// })

// const createProductRoute = createRoute({
//   method: 'post',
//   path: '/',
//   tags: ['Products'],
//   summary: 'Create a new product',
//   security: [{ Bearer: [] }],
//   request: {
//     body: { content: { 'application/json': { schema: createProductSchema } } },
//   },
//   responses: {
//     [HTTP_STATUS.CREATED]: successResponse(productEntitySchema, 'Product created'),
//     [HTTP_STATUS.UNAUTHORIZED]: errorResponse('Not authenticated'),
//     [HTTP_STATUS.BAD_REQUEST]: errorResponse('Validation error'),
//     [HTTP_STATUS.CONFLICT]: errorResponse('Product already exists'),
//   },
// })

// const getProductRoute = createRoute({
//   method: 'get',
//   path: '/{id}',
//   tags: ['Products'],
//   summary: 'Get a product by id',
//   security: [{ Bearer: [] }],
//   request: { params: idParam },
//   responses: {
//     [HTTP_STATUS.OK]: successResponse(productWithStockSchema, 'Product retrieved'),
//     [HTTP_STATUS.NOT_FOUND]: errorResponse('Product not found'),
//     [HTTP_STATUS.UNAUTHORIZED]: errorResponse('Not authenticated'),
//   },
// })

// const updateProductRoute = createRoute({
//   method: 'patch',
//   path: '/{id}',
//   tags: ['Products'],
//   summary: 'Update a product',
//   security: [{ Bearer: [] }],
//   request: {
//     params: idParam,
//     body: { content: { 'application/json': { schema: updateProductSchema } } },
//   },
//   responses: {
//     [HTTP_STATUS.OK]: successResponse(productEntitySchema, 'Product updated'),
//     [HTTP_STATUS.NOT_FOUND]: errorResponse('Product not found'),
//     [HTTP_STATUS.UNAUTHORIZED]: errorResponse('Not authenticated'),
//     [HTTP_STATUS.BAD_REQUEST]: errorResponse('Validation error'),
//     [HTTP_STATUS.CONFLICT]: errorResponse('Product already exists'),
//   },
// })

// const deleteProductRoute = createRoute({
//   method: 'delete',
//   path: '/{id}',
//   tags: ['Products'],
//   summary: 'Delete a product',
//   security: [{ Bearer: [] }],
//   request: { params: idParam },
//   responses: {
//     [HTTP_STATUS.OK]: successResponse(nullData, 'Product deleted'),
//     [HTTP_STATUS.NOT_FOUND]: errorResponse('Product not found'),
//     [HTTP_STATUS.UNAUTHORIZED]: errorResponse('Not authenticated'),
//     [HTTP_STATUS.FORBIDDEN]: errorResponse('Access denied'),
//   },
// })

// const archiveProductRoute = createRoute({
//   method: 'post',
//   path: '/{id}/archive',
//   tags: ['Products'],
//   summary: 'Archive a product',
//   security: [{ Bearer: [] }],
//   request: { params: idParam },
//   responses: {
//     [HTTP_STATUS.OK]: successResponse(productEntitySchema, 'Product archived'),
//     [HTTP_STATUS.NOT_FOUND]: errorResponse('Product not found'),
//     [HTTP_STATUS.UNAUTHORIZED]: errorResponse('Not authenticated'),
//     [HTTP_STATUS.FORBIDDEN]: errorResponse('Access denied'),
//   },
// })

// const restoreProductRoute = createRoute({
//   method: 'post',
//   path: '/{id}/restore',
//   tags: ['Products'],
//   summary: 'Restore an archived product',
//   security: [{ Bearer: [] }],
//   request: { params: idParam },
//   responses: {
//     [HTTP_STATUS.OK]: successResponse(productEntitySchema, 'Product restored'),
//     [HTTP_STATUS.NOT_FOUND]: errorResponse('Product not found'),
//     [HTTP_STATUS.UNAUTHORIZED]: errorResponse('Not authenticated'),
//     [HTTP_STATUS.FORBIDDEN]: errorResponse('Access denied'),
//   },
// })

// const updateStockRoute = createRoute({
//   method: 'patch',
//   path: '/{id}/stock',
//   tags: ['Products'],
//   summary: 'Update product stock',
//   security: [{ Bearer: [] }],
//   request: {
//     params: idParam,
//     body: { content: { 'application/json': { schema: updateStockSchema } } },
//   },
//   responses: {
//     [HTTP_STATUS.OK]: successResponse(productStockEntitySchema, 'Stock updated'),
//     [HTTP_STATUS.NOT_FOUND]: errorResponse('Product not found'),
//     [HTTP_STATUS.UNAUTHORIZED]: errorResponse('Not authenticated'),
//     [HTTP_STATUS.BAD_REQUEST]: errorResponse('Validation error'),
//     [HTTP_STATUS.FORBIDDEN]: errorResponse('Access denied'),
//   },
// })

// // Product Pages App

// const productPagesApp = new OpenAPIHono<AppEnv>()

// productPagesApp.use('*', requireJwtAuth)

// productPagesApp.onError((error, c) => {
//   if (error instanceof ProductError) {
//     return c.json(err(error.code, error.details), errorToStatus(error.code, productErrorMapping))
//   }
//   console.error('Unexpected error:', error)
//   return c.json(err('server_error'), HTTP_STATUS.INTERNAL_SERVER_ERROR)
// })

// export const productPageRoutes = productPagesApp

//   .openapi(listProductPagesRoute, async (c) => {
//     const pages = await getAllProductPages()
//     return c.json(ok(pages), HTTP_STATUS.OK)
//   })

//   .openapi(createProductPageRoute, async (c) => {
//     const input = c.req.valid('json')
//     const page = await createProductPage(input)
//     return c.json(ok(page), HTTP_STATUS.CREATED)
//   })

//   .openapi(getProductPageRoute, async (c) => {
//     const { id } = c.req.valid('param')
//     const page = await getProductPageById(id)
//     return c.json(ok(page), HTTP_STATUS.OK)
//   })

//   .openapi(updateProductPageRoute, async (c) => {
//     const { id } = c.req.valid('param')
//     const input = c.req.valid('json')
//     const page = await updateProductPage(id, input)
//     return c.json(ok(page), HTTP_STATUS.OK)
//   })

//   .openapi(deleteProductPageRoute, async (c) => {
//     const { id } = c.req.valid('param')
//     await deleteProductPage(id)
//     return c.json(ok(null), HTTP_STATUS.OK)
//   })

// // Products App

// const productsApp = new OpenAPIHono<AppEnv>()

// productsApp.use('*', requireJwtAuth)

// productsApp.onError((error, c) => {
//   if (error instanceof ProductError) {
//     return c.json(err(error.code, error.details), errorToStatus(error.code, productErrorMapping))
//   }
//   console.error('Unexpected error:', error)
//   return c.json(err('server_error'), HTTP_STATUS.INTERNAL_SERVER_ERROR)
// })

// export const productRoutes = productsApp

//   .openapi(listProductsRoute, async (c) => {
//     const userId = c.get('userId')
//     const result = await getUserProducts(userId)
//     return c.json(ok(result), HTTP_STATUS.OK)
//   })

//   .openapi(createProductRoute, async (c) => {
//     const userId = c.get('userId')
//     const input = c.req.valid('json')
//     const product = await createProduct(userId, input)
//     return c.json(ok(product), HTTP_STATUS.CREATED)
//   })

//   .openapi(getProductRoute, async (c) => {
//     const { id } = c.req.valid('param')
//     const product = await getProductById(id)
//     return c.json(ok(product), HTTP_STATUS.OK)
//   })

//   .openapi(updateProductRoute, async (c) => {
//     const { id } = c.req.valid('param')
//     const userId = c.get('userId')
//     const input = c.req.valid('json')
//     const product = await updateProduct(id, userId, input)
//     return c.json(ok(product), HTTP_STATUS.OK)
//   })

//   .openapi(deleteProductRoute, async (c) => {
//     const { id } = c.req.valid('param')
//     const userId = c.get('userId')
//     await deleteProduct(id, userId)
//     return c.json(ok(null), HTTP_STATUS.OK)
//   })

//   .openapi(archiveProductRoute, async (c) => {
//     const { id } = c.req.valid('param')
//     const userId = c.get('userId')
//     const product = await archiveProduct(id, userId)
//     return c.json(ok(product), HTTP_STATUS.OK)
//   })

//   .openapi(restoreProductRoute, async (c) => {
//     const { id } = c.req.valid('param')
//     const userId = c.get('userId')
//     const product = await restoreProduct(id, userId)
//     return c.json(ok(product), HTTP_STATUS.OK)
//   })

//   .openapi(updateStockRoute, async (c) => {
//     const { id } = c.req.valid('param')
//     const userId = c.get('userId')
//     const { qty } = c.req.valid('json')
//     const stock = await updateStock(id, userId, qty)
//     return c.json(ok(stock), HTTP_STATUS.OK)
//   })
