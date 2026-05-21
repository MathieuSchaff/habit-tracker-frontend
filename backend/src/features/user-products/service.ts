import type {
  CreateUserProductInput,
  PublicProductReviewsResponse,
  PublicReviewView,
  ReviewAxisAggregate,
  UpdateUserProductInput,
  UpdateUserProductReviewInput,
} from '@habit-tracker/shared'
import { reviewAxisKeys } from '@habit-tracker/shared'

import { and, desc, eq, isNotNull } from 'drizzle-orm'

import type { DB } from '../../db'
import { profiles } from '../../db/schema/auth/users'
import { products } from '../../db/schema/products/products'
import { userProductStatusLog } from '../../db/schema/products/user-product-status-log'
import { userProductReviews, userProducts } from '../../db/schema/user-products'
import { nowISO } from '../../utils/dates'
import { UserProductError } from './user-product-error'

// Moderation columns are admin-internal — keep them out of every Review-on-the-wire
// projection so frontend types never see them. Admin moderation surfaces query
// them explicitly via the moderation service.
const REVIEW_PUBLIC_EXCLUDE = {
  moderationStatus: false,
  moderatedBy: false,
  moderatedAt: false,
  moderationReason: false,
} as const

export async function getUserProducts(userId: string, db: DB) {
  return await db.query.userProducts.findMany({
    where: eq(userProducts.userId, userId),
    with: {
      review: { columns: REVIEW_PUBLIC_EXCLUDE },
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
      review: { columns: REVIEW_PUBLIC_EXCLUDE },
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
      review: { columns: REVIEW_PUBLIC_EXCLUDE },
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
    .returning({
      id: userProductReviews.id,
      userProductId: userProductReviews.userProductId,
      tolerance: userProductReviews.tolerance,
      efficacy: userProductReviews.efficacy,
      sensoriality: userProductReviews.sensoriality,
      stability: userProductReviews.stability,
      mixability: userProductReviews.mixability,
      valueForMoney: userProductReviews.valueForMoney,
      comment: userProductReviews.comment,
      isPublic: userProductReviews.isPublic,
      createdAt: userProductReviews.createdAt,
      updatedAt: userProductReviews.updatedAt,
    })

  return result
}

function emptyAxisAggregate(): ReviewAxisAggregate {
  return { low: 0, mid: 0, high: 0 }
}

// Public reviews surface (#7). RLS already filters non-public rows; this
// service trusts the policy and joins profiles for the pseudonym. Aggregates
// are qualitative (3 buckets per axis), never averaged — see anti-patterns
// §1/§4 (no scores, no fake precision).
export async function listPublicReviewsForProduct(
  db: DB,
  slug: string
): Promise<PublicProductReviewsResponse> {
  const rows = await db
    .select({
      id: userProductReviews.id,
      tolerance: userProductReviews.tolerance,
      efficacy: userProductReviews.efficacy,
      sensoriality: userProductReviews.sensoriality,
      stability: userProductReviews.stability,
      mixability: userProductReviews.mixability,
      valueForMoney: userProductReviews.valueForMoney,
      comment: userProductReviews.comment,
      createdAt: userProductReviews.createdAt,
      username: profiles.username,
      profilePublic: profiles.profilePublic,
    })
    .from(userProductReviews)
    .innerJoin(userProducts, eq(userProducts.id, userProductReviews.userProductId))
    .innerJoin(products, eq(products.id, userProducts.productId))
    .innerJoin(profiles, eq(profiles.userId, userProducts.userId))
    .where(
      and(
        eq(userProductReviews.isPublic, true),
        eq(userProductReviews.moderationStatus, 'visible'),
        eq(products.slug, slug),
        isNotNull(profiles.username),
        // Defense-in-depth: RLS already hides force-private profiles for
        // app_runtime; the explicit filter covers admin-pool paths (tests,
        // backfill scripts, future privileged callers).
        eq(profiles.forcedPrivateByAdmin, false)
      )
    )
    .orderBy(desc(userProductReviews.createdAt))

  const byAxis = {
    tolerance: emptyAxisAggregate(),
    efficacy: emptyAxisAggregate(),
    sensoriality: emptyAxisAggregate(),
    stability: emptyAxisAggregate(),
    mixability: emptyAxisAggregate(),
    valueForMoney: emptyAxisAggregate(),
  }

  const reviews: PublicReviewView[] = rows.map((row) => {
    for (const key of reviewAxisKeys) {
      const val = row[key]
      if (val == null) continue
      if (val <= 2) byAxis[key].low += 1
      else if (val === 3) byAxis[key].mid += 1
      else byAxis[key].high += 1
    }
    return {
      id: row.id,
      tolerance: row.tolerance,
      efficacy: row.efficacy,
      sensoriality: row.sensoriality,
      stability: row.stability,
      mixability: row.mixability,
      valueForMoney: row.valueForMoney,
      comment: row.comment,
      createdAt: row.createdAt,
      reviewer: {
        // isNotNull guard above narrows the column type at the SQL layer.
        username: row.username as string,
        profilePublic: row.profilePublic,
      },
    }
  })

  return {
    reviews,
    aggregates: { total: reviews.length, byAxis },
  }
}
