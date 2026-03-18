import type {
  CreateUserProductInput,
  UpdateUserProductInput,
  UpdateUserProductReviewInput,
} from '@habit-tracker/shared'

import { and, eq } from 'drizzle-orm'

import { userProductReviews, userProducts } from '../../db/schema/user-products'
import type { DB } from '../../db/types'
import { UserProductError } from './user-product-error'

export async function getUserProducts(userId: string, db: DB) {
  return await db.query.userProducts.findMany({
    where: eq(userProducts.userId, userId),
    with: {
      review: true,
      product: {
        with: {
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
      product: {
        with: {
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
      product: {
        with: {
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
  const [result] = await db
    .insert(userProducts)
    .values({
      userId,
      productId: input.productId,
      status: input.status,
      qty: input.qty,
      sentiment: input.sentiment,
      wouldRepurchase: input.wouldRepurchase,
      comment: input.comment,
    })
    .onConflictDoUpdate({
      target: [userProducts.userId, userProducts.productId],
      set: {
        status: input.status,
        qty: input.qty,
        sentiment: input.sentiment,
        wouldRepurchase: input.wouldRepurchase,
        comment: input.comment,
        updatedAt: new Date(),
      },
    })
    .returning()
  return result
}

export async function updateUserProduct(
  userId: string,
  userProductId: string,
  input: UpdateUserProductInput,
  db: DB
) {
  const [result] = await db
    .update(userProducts)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(and(eq(userProducts.id, userProductId), eq(userProducts.userId, userId)))
    .returning()
  return result
}

export async function deleteUserProduct(userId: string, userProductId: string, db: DB) {
  await db
    .delete(userProducts)
    .where(and(eq(userProducts.id, userProductId), eq(userProducts.userId, userId)))
}

export async function upsertUserProductReview(
  userId: string,
  userProductId: string,
  input: UpdateUserProductReviewInput,
  db: DB
) {
  // Verify user owns the userProduct
  const userProduct = await db.query.userProducts.findFirst({
    where: and(eq(userProducts.id, userProductId), eq(userProducts.userId, userId)),
  })

  if (!userProduct) {
    throw new UserProductError('not_found')
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
        updatedAt: new Date(),
      },
    })
    .returning()

  return result
}
