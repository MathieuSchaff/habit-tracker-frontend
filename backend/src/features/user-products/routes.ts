import {
  addPurchaseSchema,
  createUserProductSchema,
  err,
  finishPurchaseSchema,
  HTTP_STATUS,
  ok,
  openPurchaseSchema,
  updatePurchaseSchema,
  updateUserProductReviewSchema,
  updateUserProductSchema,
} from '@habit-tracker/shared'

import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import type { AppEnv } from '../../app-env'
import { recalculateSignalForUser } from '../../services/dermoSignalService'
import { requireJwtAuth } from '../auth/middleware'
import {
  addPurchase,
  deletePurchase,
  finishPurchase,
  getPurchases,
  openPurchase,
  updatePurchase,
} from './purchase.service'
import {
  createUserProduct,
  deleteUserProduct,
  getUserProductById,
  getUserProductByProductId,
  getUserProducts,
  updateUserProduct,
  upsertUserProductReview,
} from './service'

const app = new Hono<AppEnv>()

app.use('*', requireJwtAuth)

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

      // Fire-and-forget: recalculate dermo signal after review save.
      // Does not block the HTTP response.
      recalculateSignalForUser(userId, id, db).catch((err) =>
        console.error('[dermoSignal] recalculation failed:', err)
      )

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

  .patch(
    '/:id/purchases/:purchaseId',
    zValidator('param', z.object({ id: z.uuid(), purchaseId: z.uuid() })),
    zValidator('json', updatePurchaseSchema),
    async (c) => {
      const db = c.get('db')
      const userId = c.get('userId')
      const { purchaseId } = c.req.valid('param')
      const input = c.req.valid('json')
      const result = await updatePurchase(userId, purchaseId, input, db)
      return c.json(ok(result), HTTP_STATUS.OK)
    }
  )

  .delete(
    '/:id/purchases/:purchaseId',
    zValidator('param', z.object({ id: z.uuid(), purchaseId: z.uuid() })),
    async (c) => {
      const db = c.get('db')
      const userId = c.get('userId')
      const { purchaseId } = c.req.valid('param')
      await deletePurchase(userId, purchaseId, db)
      return c.json(ok(null), HTTP_STATUS.OK)
    }
  )
