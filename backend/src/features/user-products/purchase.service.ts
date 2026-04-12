import type {
  AddPurchaseInput,
  FinishPurchaseInput,
  OpenPurchaseInput,
  UpdatePurchaseInput,
} from '@habit-tracker/shared'

import { and, desc, eq, isNull, not } from 'drizzle-orm'

import type { DB } from '../../db'
import { purchases } from '../../db/schema/products/purchases'
import { userProducts } from '../../db/schema/user-products'
import { PurchaseError } from './purchase-error'

async function verifyOwnership(userId: string, userProductId: string, db: DB) {
  const up = await db.query.userProducts.findFirst({
    where: and(eq(userProducts.id, userProductId), eq(userProducts.userId, userId)),
  })
  if (!up) throw new PurchaseError('user_product_not_found')
  return up
}

export async function addPurchase(
  userId: string,
  userProductId: string,
  input: AddPurchaseInput,
  db: DB
) {
  await verifyOwnership(userId, userProductId, db)

  const [result] = await db
    .insert(purchases)
    .values({
      userProductId,
      purchasedAt: input.purchasedAt,
      pricePaidCents: input.pricePaidCents ?? null,
      expiresAt: input.expiresAt ?? null,
    })
    .returning()

  if (!result) {
    throw new PurchaseError('purchase_creation_failed')
  }
  return result
}

export async function getPurchases(userId: string, userProductId: string, db: DB) {
  await verifyOwnership(userId, userProductId, db)

  return db.query.purchases.findMany({
    where: eq(purchases.userProductId, userProductId),
    orderBy: desc(purchases.purchasedAt),
  })
}

export async function openPurchase(
  userId: string,
  purchaseId: string,
  input: OpenPurchaseInput,
  db: DB
) {
  // find the purchase and check the user is the owner
  const purchase = await db.query.purchases.findFirst({
    where: eq(purchases.id, purchaseId),
    with: { userProduct: true },
  })

  if (!purchase || purchase.userProduct.userId !== userId) {
    throw new PurchaseError('purchase_not_found')
  }

  // can't have two purchases open at the same time for one user product
  const active = await db.query.purchases.findFirst({
    where: and(
      eq(purchases.userProductId, purchase.userProductId),
      not(isNull(purchases.openedAt)),
      isNull(purchases.finishedAt)
    ),
  })

  if (active && active.id !== purchaseId) {
    throw new PurchaseError('active_purchase_exists')
  }

  const [result] = await db
    .update(purchases)
    .set({ openedAt: input.openedAt })
    .where(eq(purchases.id, purchaseId))
    .returning()

  if (!result) {
    throw new PurchaseError('purchase_creation_failed')
  }
  return result
}

export async function finishPurchase(
  userId: string,
  userProductId: string,
  input: FinishPurchaseInput,
  db: DB
) {
  await verifyOwnership(userId, userProductId, db)

  // find the open purchase and close it
  const [result] = await db
    .update(purchases)
    .set({ finishedAt: input.finishedAt })
    .where(
      and(
        eq(purchases.userProductId, userProductId),
        not(isNull(purchases.openedAt)),
        isNull(purchases.finishedAt)
      )
    )
    .returning()

  if (!result) throw new PurchaseError('no_active_purchase')

  return result
}

export async function updatePurchase(
  userId: string,
  purchaseId: string,
  input: UpdatePurchaseInput,
  db: DB
) {
  // use a join with userProduct to check ownership at same time
  const purchase = await db.query.purchases.findFirst({
    where: eq(purchases.id, purchaseId),
    with: { userProduct: true },
  })

  if (!purchase || purchase.userProduct.userId !== userId) {
    throw new PurchaseError('purchase_not_found')
  }

  const [result] = await db
    .update(purchases)
    .set({
      ...(input.purchasedAt !== undefined && { purchasedAt: input.purchasedAt }),
      ...(input.pricePaidCents !== undefined && { pricePaidCents: input.pricePaidCents }),
    })
    .where(eq(purchases.id, purchaseId))
    .returning()

  if (!result) {
    throw new PurchaseError('purchase_creation_failed')
  }
  return result
}

export async function deletePurchase(userId: string, purchaseId: string, db: DB) {
  // same thing, check the owner with a join before delete
  const purchase = await db.query.purchases.findFirst({
    where: eq(purchases.id, purchaseId),
    with: { userProduct: true },
  })

  if (!purchase || purchase.userProduct.userId !== userId) {
    throw new PurchaseError('purchase_not_found')
  }

  await db.delete(purchases).where(eq(purchases.id, purchaseId))
}
