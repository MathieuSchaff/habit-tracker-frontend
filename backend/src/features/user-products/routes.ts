import {
  addStockEntrySchema,
  createUserProductSchema,
  err,
  errorToStatus,
  HTTP_STATUS,
  ok,
  stockErrorMapping,
  updateUserProductReviewSchema,
  updateUserProductSchema,
} from '@habit-tracker/shared'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import type { AppEnv } from '../../app-env'
import { requireJwtAuth } from '../auth/middleware'
import {
  addStockEntry,
  createUserProduct,
  deleteUserProduct,
  getStockEntries,
  getUserProductById,
  getUserProductByProductId,
  getUserProducts,
  updateUserProduct,
  upsertUserProductReview,
} from './service'
import { UserProductError } from './user-product-error'

const userProductApp = new Hono<AppEnv>()

userProductApp.use('*', requireJwtAuth)

userProductApp.onError((error, c) => {
  if (error instanceof UserProductError) {
    if (error.code === 'not_found') {
      return c.json(err('not_found'), HTTP_STATUS.NOT_FOUND)
    }
    return c.json(
      err(error.code, error.details),
      errorToStatus(error.code, stockErrorMapping)
    )
  }
  console.error('Unexpected error in userProductRoutes:', error)
  return c.json(err('server_error'), HTTP_STATUS.INTERNAL_SERVER_ERROR)
})

const userProductIdParam = z.object({ id: z.string().uuid() })
const productIdParam = z.object({ productId: z.string().uuid() })

export const userProductRoutes = userProductApp
  .get('/', async (c) => {
    const db = c.get('db')
    const userId = c.get('userId')
    const result = await getUserProducts(userId, db)
    return c.json(ok(result), HTTP_STATUS.OK)
  })

  .get('/stock-entries', async (c) => {
    const db = c.get('db')
    const userId = c.get('userId')
    const result = await getStockEntries(userId, db)
    return c.json(ok(result), HTTP_STATUS.OK)
  })

  .get('/:id', zValidator('param', userProductIdParam), async (c) => {
    const db = c.get('db')
    const userId = c.get('userId')
    const { id } = c.req.valid('param')
    const result = await getUserProductById(userId, id, db)
    if (!result) {
      return c.json(err('not_found'), HTTP_STATUS.NOT_FOUND)
    }
    return c.json(ok(result), HTTP_STATUS.OK)
  })

  .get('/product/:productId', zValidator('param', productIdParam), async (c) => {
    const db = c.get('db')
    const userId = c.get('userId')
    const { productId } = c.req.valid('param')
    const result = await getUserProductByProductId(userId, productId, db)
    if (!result) {
      return c.json(err('not_found'), HTTP_STATUS.NOT_FOUND)
    }
    return c.json(ok(result), HTTP_STATUS.OK)
  })

  .post('/', zValidator('json', createUserProductSchema), async (c) => {
    const db = c.get('db')
    const userId = c.get('userId')
    const input = c.req.valid('json')
    const result = await createUserProduct(userId, input, db)
    return c.json(ok(result), HTTP_STATUS.CREATED)
  })

  .post(
    '/:productId/stock-entries',
    zValidator('param', productIdParam),
    zValidator('json', addStockEntrySchema),
    async (c) => {
      const db = c.get('db')
      const userId = c.get('userId')
      const { productId } = c.req.valid('param')
      const input = c.req.valid('json')
      const result = await addStockEntry(userId, productId, input, db)
      return c.json(ok(result), HTTP_STATUS.CREATED)
    }
  )

  .patch('/:id', zValidator('param', userProductIdParam), zValidator('json', updateUserProductSchema), async (c) => {
    const db = c.get('db')
    const userId = c.get('userId')
    const { id } = c.req.valid('param')
    const input = c.req.valid('json')
    const result = await updateUserProduct(userId, id, input, db)
    if (!result) {
      return c.json(err('not_found'), HTTP_STATUS.NOT_FOUND)
    }
    return c.json(ok(result), HTTP_STATUS.OK)
  })

  .delete('/:id', zValidator('param', userProductIdParam), async (c) => {
    const db = c.get('db')
    const userId = c.get('userId')
    const { id } = c.req.valid('param')
    await deleteUserProduct(userId, id, db)
    return c.json(ok(null), HTTP_STATUS.OK)
  })

  // Review (structured evaluation)
  .put('/:id/review', zValidator('param', userProductIdParam), zValidator('json', updateUserProductReviewSchema), async (c) => {
    const db = c.get('db')
    const userId = c.get('userId')
    const { id } = c.req.valid('param')
    const input = c.req.valid('json')
    const result = await upsertUserProductReview(userId, id, input, db)
    return c.json(ok(result), HTTP_STATUS.OK)
  })
