import type {
  CreateUserProductInput,
  UpdateUserProductInput,
  UpdateUserProductReviewInput,
} from '@habit-tracker/shared'

import { and, desc, eq } from 'drizzle-orm'

import type { DB } from '../../db'
import { userProductStatusLog } from '../../db/schema/products/user-product-status-log'
import { userProductReviews, userProducts } from '../../db/schema/user-products'
import { nowISO } from '../../utils/dates'
import { UserProductError } from './user-product-error'

export async function getUserProducts(userId: string, db: DB) {
  return await db.query.userProducts.findMany({
    where: eq(userProducts.userId, userId),
    with: {
      review: true,
      purchases: true,
      product: {
        with: {
          tagProducts: {
            with: {
              productTag: true,
            },
          },
          productIngredients: {
            with: {
              ingredient: true,
            },
          },
        },
      },
    },
  })
}

export async function getUserProductById(userId: string, userProductId: string, db: DB) {
  return await db.query.userProducts.findFirst({
    where: and(eq(userProducts.id, userProductId), eq(userProducts.userId, userId)),
    with: {
      review: true,
      purchases: true,
      product: {
        with: {
          tagProducts: {
            with: {
              productTag: true,
            },
          },
          productIngredients: {
            with: {
              ingredient: true,
            },
          },
        },
      },
    },
  })
}

export async function getUserProductByProductId(userId: string, productId: string, db: DB) {
  return await db.query.userProducts.findFirst({
    where: and(eq(userProducts.productId, productId), eq(userProducts.userId, userId)),
    with: {
      review: true,
      purchases: true,
      product: {
        with: {
          tagProducts: {
            with: {
              productTag: true,
            },
          },
          productIngredients: {
            with: {
              ingredient: true,
            },
          },
        },
      },
    },
  })
}

export async function createUserProduct(userId: string, input: CreateUserProductInput, db: DB) {
  return await db.transaction(async (tx) => {
    const existing = await tx.query.userProducts.findFirst({
      where: and(eq(userProducts.userId, userId), eq(userProducts.productId, input.productId)),
      columns: { id: true, status: true },
    })

    const [result] = await tx
      .insert(userProducts)
      .values({
        userId,
        productId: input.productId,
        status: input.status,
        sentiment: input.sentiment,
        wouldRepurchase: input.wouldRepurchase,
        comment: input.comment,
      })
      .onConflictDoUpdate({
        target: [userProducts.userId, userProducts.productId],
        set: {
          status: input.status,
          sentiment: input.sentiment,
          wouldRepurchase: input.wouldRepurchase,
          comment: input.comment,
          updatedAt: nowISO(),
        },
      })
      .returning()

    if (!result) {
      throw new UserProductError('user_product_creation_failed')
    }

    // Append-only journal: log the initial transition (null → status) on
    // creation, or the change (prev → new) when an existing row gets
    // re-statused via upsert. Idle upserts (same status) write no row.
    const fromStatus = existing?.status ?? null
    if (fromStatus !== result.status) {
      await tx.insert(userProductStatusLog).values({
        userProductId: result.id,
        userId,
        fromStatus,
        toStatus: result.status,
      })
    }

    return result
  })
}

export async function updateUserProduct(
  userId: string,
  userProductId: string,
  input: UpdateUserProductInput,
  db: DB
) {
  const { reason, ...patch } = input
  return await db.transaction(async (tx) => {
    const previous = await tx.query.userProducts.findFirst({
      where: and(eq(userProducts.id, userProductId), eq(userProducts.userId, userId)),
      columns: { status: true },
    })

    if (!previous) {
      throw new UserProductError('user_product_not_found')
    }

    const [result] = await tx
      .update(userProducts)
      .set({
        ...patch,
        updatedAt: nowISO(),
      })
      .where(and(eq(userProducts.id, userProductId), eq(userProducts.userId, userId)))
      .returning()

    if (!result) {
      throw new UserProductError('user_product_not_found')
    }

    if (patch.status !== undefined && patch.status !== previous.status) {
      await tx.insert(userProductStatusLog).values({
        userProductId: result.id,
        userId,
        fromStatus: previous.status,
        toStatus: patch.status,
        reason: reason?.trim() || null,
      })
    }

    return result
  })
}

export async function getUserProductStatusHistory(userId: string, userProductId: string, db: DB) {
  // Ownership check first — fkTenantPolicies on the log already enforces it
  // at the row level, but failing fast with a clear error beats an empty list
  // when the caller passes a foreign id.
  const owner = await db.query.userProducts.findFirst({
    where: and(eq(userProducts.id, userProductId), eq(userProducts.userId, userId)),
    columns: { id: true },
  })
  if (!owner) {
    throw new UserProductError('user_product_not_found')
  }

  return await db
    .select({
      id: userProductStatusLog.id,
      userProductId: userProductStatusLog.userProductId,
      fromStatus: userProductStatusLog.fromStatus,
      toStatus: userProductStatusLog.toStatus,
      reason: userProductStatusLog.reason,
      createdAt: userProductStatusLog.createdAt,
    })
    .from(userProductStatusLog)
    .where(eq(userProductStatusLog.userProductId, userProductId))
    .orderBy(desc(userProductStatusLog.createdAt))
}

export async function deleteUserProduct(userId: string, userProductId: string, db: DB) {
  const [result] = await db
    .delete(userProducts)
    .where(and(eq(userProducts.id, userProductId), eq(userProducts.userId, userId)))
    .returning()

  if (!result) {
    throw new UserProductError('user_product_not_found')
  }
}

export async function upsertUserProductReview(
  userId: string,
  userProductId: string,
  input: UpdateUserProductReviewInput,
  db: DB
) {
  // need to check if the user own the product before saving the review
  const userProduct = await db.query.userProducts.findFirst({
    where: and(eq(userProducts.id, userProductId), eq(userProducts.userId, userId)),
  })

  if (!userProduct) {
    throw new UserProductError('user_product_not_found')
  }

  const [result] = await db
    .insert(userProductReviews)
    .values({
      userProductId,
      ...input,
    })
    .onConflictDoUpdate({
      target: userProductReviews.userProductId,
      set: {
        ...input,
        updatedAt: nowISO(),
      },
    })
    .returning()

  return result
}
