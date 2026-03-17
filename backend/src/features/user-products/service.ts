import type {
  AddStockEntryInput,
  CreateUserProductInput,
  UpdateUserProductInput,
  UpdateUserProductReviewInput,
} from '@habit-tracker/shared'

import { and, desc, eq, sql } from 'drizzle-orm'

import { products } from '../../db/schema/products'
import { stockEntries } from '../../db/schema/stock-entries'
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

export async function getStockEntries(userId: string, db: DB) {
  return db
    .select({
      id: stockEntries.id,
      productId: stockEntries.productId,
      qty: stockEntries.qty,
      pricePaidCents: stockEntries.pricePaidCents,
      purchasedAt: stockEntries.purchasedAt,
      createdAt: stockEntries.createdAt,
      product: {
        name: products.name,
        brand: products.brand,
      },
    })
    .from(stockEntries)
    .innerJoin(products, eq(stockEntries.productId, products.id))
    .where(eq(stockEntries.userId, userId))
    .orderBy(desc(stockEntries.purchasedAt), desc(stockEntries.createdAt))
}

export async function addStockEntry(
  userId: string,
  productId: string,
  input: AddStockEntryInput,
  db: DB
) {
  return db.transaction(async (tx) => {
    const [productExists] = await tx
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1)

    if (!productExists) throw new UserProductError('product_not_found')

    const [entry] = await tx
      .insert(stockEntries)
      .values({
        userId,
        productId,
        qty: input.qty,
        pricePaidCents: input.pricePaidCents ?? null,
        purchasedAt: input.purchasedAt,
      })
      .returning()

    if (!entry) throw new UserProductError('stock_entry_failed')

    const [stock] = await tx
      .insert(userProducts)
      .values({ userId, productId, qty: input.qty, status: 'in_stock' })
      .onConflictDoUpdate({
        target: [userProducts.userId, userProducts.productId],
        set: {
          qty: sql`${userProducts.qty} + ${input.qty}`,
          status: 'in_stock',
          updatedAt: new Date(),
        },
      })
      .returning()

    if (!stock) throw new UserProductError('stock_entry_failed')

    return { entry, stock }
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
