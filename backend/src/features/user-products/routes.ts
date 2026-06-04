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
} from '@aurore/shared'

import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'

import type { AppEnv } from '../../app-env'
import { userProductReviews } from '../../db/schema/products/user-products'
import { recalculateAllSignalsForUser } from '../../services/dermoSignalService'
import { zValidator } from '../../utils/validator'
import { isUserBannedForScope } from '../auth/ban.service'
import { getAuthedUserId, requireJwtAuth, requireNotBanned } from '../auth/middleware'
import { withRlsContext } from '../auth/rls-context.middleware'
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
  getUserProductStatusHistory,
  getUserProducts,
  updateUserProduct,
  upsertUserProductReview,
} from './service'

const idParam = z.object({ id: z.uuid() })
const purchaseParams = z.object({ id: z.uuid(), purchaseId: z.uuid() })

const app = new Hono<AppEnv>()

app.use('*', requireJwtAuth)
app.use('*', requireNotBanned)
app.use('*', withRlsContext)

export const userProductRoutes = app
  .get('/', async (c) => {
    const db = c.get('db')
    const userId = getAuthedUserId(c)
    const result = await getUserProducts(userId, db)
    return c.json(ok(result), HTTP_STATUS.OK)
  })

  .post('/', zValidator('json', createUserProductSchema), async (c) => {
    const db = c.get('db')
    const userId = getAuthedUserId(c)
    const input = c.req.valid('json')
    const result = await createUserProduct(userId, input, db)
    return c.json(ok(result), HTTP_STATUS.CREATED)
  })

  .get('/:id', zValidator('param', idParam), async (c) => {
    const db = c.get('db')
    const userId = getAuthedUserId(c)
    const { id } = c.req.valid('param')
    const result = await getUserProductById(userId, id, db)
    if (!result) return c.json(err('user_product_not_found'), HTTP_STATUS.NOT_FOUND)
    return c.json(ok(result), HTTP_STATUS.OK)
  })

  .get('/product/:productId', zValidator('param', z.object({ productId: z.uuid() })), async (c) => {
    const db = c.get('db')
    const userId = getAuthedUserId(c)
    const { productId } = c.req.valid('param')
    const result = await getUserProductByProductId(userId, productId, db)
    if (!result) return c.json(err('user_product_not_found'), HTTP_STATUS.NOT_FOUND)
    return c.json(ok(result), HTTP_STATUS.OK)
  })

  .patch(
    '/:id',
    zValidator('param', idParam),
    zValidator('json', updateUserProductSchema),
    async (c) => {
      const db = c.get('db')
      const userId = getAuthedUserId(c)
      const { id } = c.req.valid('param')
      const input = c.req.valid('json')
      const result = await updateUserProduct(userId, id, input, db)

      // status/sentiment changes move products between the bad/good buckets.
      if (input.status !== undefined || input.sentiment !== undefined) {
        await recalculateAllSignalsForUser(userId, db)
      }

      return c.json(ok(result), HTTP_STATUS.OK)
    }
  )

  .delete('/:id', zValidator('param', idParam), async (c) => {
    const db = c.get('db')
    const userId = getAuthedUserId(c)
    const { id } = c.req.valid('param')
    await deleteUserProduct(userId, id, db)
    // Removing a product changes the collection's bucket totals.
    await recalculateAllSignalsForUser(userId, db)
    return c.json(ok(null), HTTP_STATUS.OK)
  })

  .put(
    '/:id/review',
    zValidator('param', idParam),
    zValidator('json', updateUserProductReviewSchema),
    async (c) => {
      const db = c.get('db')
      const userId = getAuthedUserId(c)
      const { id } = c.req.valid('param')
      const input = c.req.valid('json')

      // review_publish ban must be checked against the resolved final isPublic,
      // not the raw input: upsert preserves existing isPublic when input omits it.
      let resultingPublic = input.isPublic
      if (resultingPublic === undefined) {
        const existing = await db.query.userProductReviews.findFirst({
          where: eq(userProductReviews.userProductId, id),
          columns: { isPublic: true },
        })
        resultingPublic = existing?.isPublic ?? false
      }

      if (resultingPublic) {
        const ban = await isUserBannedForScope(db, userId, 'review_publish')
        if (ban) {
          return c.json(
            err('banned', {
              expiresAt: ban.expiresAt,
              reason: ban.reason,
              scope: 'review_publish',
            }),
            HTTP_STATUS.FORBIDDEN
          )
        }
      }

      const result = await upsertUserProductReview(userId, id, input, db)

      // Only tolerance moves the bad/good buckets; editing a comment or visibility
      // flag doesn't, so skip the full-collection recompute for those.
      // Awaited inside the request tx: a detached promise would race the tx commit
      // (one connection per tx) and run with no RLS context, silently dropping it.
      if (input.tolerance !== undefined) {
        await recalculateAllSignalsForUser(userId, db)
      }

      return c.json(ok(result), HTTP_STATUS.OK)
    }
  )

  .get('/:id/history', zValidator('param', idParam), async (c) => {
    const db = c.get('db')
    const userId = getAuthedUserId(c)
    const { id } = c.req.valid('param')
    const result = await getUserProductStatusHistory(userId, id, db)
    return c.json(ok(result), HTTP_STATUS.OK)
  })

  .get('/:id/purchases', zValidator('param', idParam), async (c) => {
    const db = c.get('db')
    const userId = getAuthedUserId(c)
    const { id } = c.req.valid('param')
    const result = await getPurchases(userId, id, db)
    return c.json(ok(result), HTTP_STATUS.OK)
  })

  .post(
    '/:id/purchases',
    zValidator('param', idParam),
    zValidator('json', addPurchaseSchema),
    async (c) => {
      const db = c.get('db')
      const userId = getAuthedUserId(c)
      const { id } = c.req.valid('param')
      const input = c.req.valid('json')
      const result = await addPurchase(userId, id, input, db)
      return c.json(ok(result), HTTP_STATUS.CREATED)
    }
  )

  .post(
    '/:id/purchases/finish',
    zValidator('param', idParam),
    zValidator('json', finishPurchaseSchema),
    async (c) => {
      const db = c.get('db')
      const userId = getAuthedUserId(c)
      const { id } = c.req.valid('param')
      const input = c.req.valid('json')
      const result = await finishPurchase(userId, id, input, db)
      return c.json(ok(result), HTTP_STATUS.OK)
    }
  )

  .post(
    '/:id/purchases/:purchaseId/open',
    zValidator('param', purchaseParams),
    zValidator('json', openPurchaseSchema),
    async (c) => {
      const db = c.get('db')
      const userId = getAuthedUserId(c)
      const { purchaseId } = c.req.valid('param')
      const input = c.req.valid('json')
      const result = await openPurchase(userId, purchaseId, input, db)
      return c.json(ok(result), HTTP_STATUS.OK)
    }
  )

  .patch(
    '/:id/purchases/:purchaseId',
    zValidator('param', purchaseParams),
    zValidator('json', updatePurchaseSchema),
    async (c) => {
      const db = c.get('db')
      const userId = getAuthedUserId(c)
      const { purchaseId } = c.req.valid('param')
      const input = c.req.valid('json')
      const result = await updatePurchase(userId, purchaseId, input, db)
      return c.json(ok(result), HTTP_STATUS.OK)
    }
  )

  .delete('/:id/purchases/:purchaseId', zValidator('param', purchaseParams), async (c) => {
    const db = c.get('db')
    const userId = getAuthedUserId(c)
    const { purchaseId } = c.req.valid('param')
    await deletePurchase(userId, purchaseId, db)
    return c.json(ok(null), HTTP_STATUS.OK)
  })
