import {
  addPurchaseSchema,
  createUserProductSchema,
  err,
  errorToStatus,
  finishPurchaseSchema,
  HTTP_STATUS,
  ok,
  openPurchaseSchema,
  purchaseErrorMapping,
  updateUserProductReviewSchema,
  updateUserProductSchema,
  userProductErrorMapping,
} from '@habit-tracker/shared'

import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import type { AppEnv } from '../../app-env'
import { requireJwtAuth } from '../auth/middleware'
import { addPurchase, finishPurchase, getPurchases, openPurchase } from './purchase.service'
import { PurchaseError } from './purchase-error'
import {
  createUserProduct,
  deleteUserProduct,
  getUserProductById,
  getUserProductByProductId,
  getUserProducts,
  updateUserProduct,
  upsertUserProductReview,
} from './service'
import { UserProductError } from './user-product-error'

const app = new Hono<AppEnv>()

app.use('*', requireJwtAuth)

app.onError((error, c) => {
  if (error instanceof UserProductError) {
    return c.json(err(error.code), errorToStatus(error.code, userProductErrorMapping))
  }
  if (error instanceof PurchaseError) {
    return c.json(err(error.code), errorToStatus(error.code, purchaseErrorMapping))
  }
  console.error('Unexpected error in user products routes:', error)
  return c.json(err('server_error'), HTTP_STATUS.INTERNAL_SERVER_ERROR)
})

export const userProductRoutes = app
  .get('/', async (c) => {
    const db = c.get('db')
    const userId = c.get('userId')
    const result = await getUserProducts(userId, db)
    return c.json(ok(result), HTTP_STATUS.OK)
  })

  .post('/', zValidator('json', createUserProductSchema), async (c) => {
    const db = c.get('db')
    const userId = c.get('userId')
    const input = c.req.valid('json')
    const result = await createUserProduct(userId, input, db)
    return c.json(ok(result), HTTP_STATUS.CREATED)
  })

  .get('/:id', zValidator('param', z.object({ id: z.uuid() })), async (c) => {
    const db = c.get('db')
    const userId = c.get('userId')
    const { id } = c.req.valid('param')
    const result = await getUserProductById(userId, id, db)
    if (!result) return c.json(err('user_product_not_found'), HTTP_STATUS.NOT_FOUND)
    return c.json(ok(result), HTTP_STATUS.OK)
  })

  .get('/product/:productId', zValidator('param', z.object({ productId: z.uuid() })), async (c) => {
    const db = c.get('db')
    const userId = c.get('userId')
    const { productId } = c.req.valid('param')
    const result = await getUserProductByProductId(userId, productId, db)
    if (!result) return c.json(err('user_product_not_found'), HTTP_STATUS.NOT_FOUND)
    return c.json(ok(result), HTTP_STATUS.OK)
  })

  .patch(
    '/:id',
    zValidator('param', z.object({ id: z.uuid() })),
    zValidator('json', updateUserProductSchema),
    async (c) => {
      const db = c.get('db')
      const userId = c.get('userId')
      const { id } = c.req.valid('param')
      const input = c.req.valid('json')
      const result = await updateUserProduct(userId, id, input, db)
      return c.json(ok(result), HTTP_STATUS.OK)
    }
  )

  .delete('/:id', zValidator('param', z.object({ id: z.uuid() })), async (c) => {
    const db = c.get('db')
    const userId = c.get('userId')
    const { id } = c.req.valid('param')
    await deleteUserProduct(userId, id, db)
    return c.json(ok(null), HTTP_STATUS.OK)
  })

  .put(
    '/:id/review',
    zValidator('param', z.object({ id: z.uuid() })),
    zValidator('json', updateUserProductReviewSchema),
    async (c) => {
      const db = c.get('db')
      const userId = c.get('userId')
      const { id } = c.req.valid('param')
      const input = c.req.valid('json')
      const result = await upsertUserProductReview(userId, id, input, db)
      return c.json(ok(result), HTTP_STATUS.OK)
    }
  )

  .get('/:id/purchases', zValidator('param', z.object({ id: z.uuid() })), async (c) => {
    const db = c.get('db')
    const userId = c.get('userId')
    const { id } = c.req.valid('param')
    const result = await getPurchases(userId, id, db)
    return c.json(ok(result), HTTP_STATUS.OK)
  })

  .post(
    '/:id/purchases',
    zValidator('param', z.object({ id: z.uuid() })),
    zValidator('json', addPurchaseSchema),
    async (c) => {
      const db = c.get('db')
      const userId = c.get('userId')
      const { id } = c.req.valid('param')
      const input = c.req.valid('json')
      const result = await addPurchase(userId, id, input, db)
      return c.json(ok(result), HTTP_STATUS.CREATED)
    }
  )

  .post(
    '/:id/purchases/finish',
    zValidator('param', z.object({ id: z.uuid() })),
    zValidator('json', finishPurchaseSchema),
    async (c) => {
      const db = c.get('db')
      const userId = c.get('userId')
      const { id } = c.req.valid('param')
      const input = c.req.valid('json')
      const result = await finishPurchase(userId, id, input, db)
      return c.json(ok(result), HTTP_STATUS.OK)
    }
  )

  .post(
    '/:id/purchases/:purchaseId/open',
    zValidator('param', z.object({ id: z.uuid(), purchaseId: z.uuid() })),
    zValidator('json', openPurchaseSchema),
    async (c) => {
      const db = c.get('db')
      const userId = c.get('userId')
      const { purchaseId } = c.req.valid('param')
      const input = c.req.valid('json')
      const result = await openPurchase(userId, purchaseId, input, db)
      return c.json(ok(result), HTTP_STATUS.OK)
    }
  )
