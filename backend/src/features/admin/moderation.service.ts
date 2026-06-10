import type {
  CatalogQueueQuery,
  CatalogQueueResponse,
  ContentPreviewResult,
  ModerateContentInput,
  ModerateContentResult,
  ModerateProfileInput,
  ModerateProfileResult,
} from '@aurore/shared'

import { and, desc, eq, ne, sql } from 'drizzle-orm'

import type { Database } from '../../db'
import {
  discussionReplies,
  discussionThreads,
  ingredients,
  products,
  userProductReviews,
} from '../../db/schema'
import { profiles } from '../../db/schema/auth/users'
import { userProducts } from '../../db/schema/products/user-products'
import { translateUniqueViolation } from '../../lib/catalog'
import { nowISO } from '../../utils/dates'
import { IngredientError } from '../ingredients/ingredients-error'
import { ProductError } from '../products/product-error'

type ModerateArgs = {
  id: string
  adminId: string
  body: ModerateContentInput
}

function buildUpdates(args: ModerateArgs) {
  return {
    moderationStatus: args.body.status,
    moderatedBy: args.adminId,
    moderatedAt: nowISO(),
    moderationReason: args.body.reason ?? null,
  }
}

export async function moderateReview(
  db: Database,
  args: ModerateArgs
): Promise<ModerateContentResult> {
  const [row] = await db
    .update(userProductReviews)
    .set(buildUpdates(args))
    .where(eq(userProductReviews.id, args.id))
    .returning({
      id: userProductReviews.id,
      moderationStatus: userProductReviews.moderationStatus,
      moderationReason: userProductReviews.moderationReason,
    })
  if (!row) return { success: false, error: 'not_found' }
  return { success: true, data: row }
}

export async function moderateThread(
  db: Database,
  args: ModerateArgs
): Promise<ModerateContentResult> {
  const [row] = await db
    .update(discussionThreads)
    .set(buildUpdates(args))
    .where(eq(discussionThreads.id, args.id))
    .returning({
      id: discussionThreads.id,
      moderationStatus: discussionThreads.moderationStatus,
      moderationReason: discussionThreads.moderationReason,
    })
  if (!row) return { success: false, error: 'not_found' }
  return { success: true, data: row }
}

export async function moderateReply(
  db: Database,
  args: ModerateArgs
): Promise<ModerateContentResult> {
  const [row] = await db
    .update(discussionReplies)
    .set(buildUpdates(args))
    .where(eq(discussionReplies.id, args.id))
    .returning({
      id: discussionReplies.id,
      moderationStatus: discussionReplies.moderationStatus,
      moderationReason: discussionReplies.moderationReason,
    })
  if (!row) return { success: false, error: 'not_found' }
  return { success: true, data: row }
}

export async function moderateProduct(
  db: Database,
  args: ModerateArgs
): Promise<ModerateContentResult> {
  if (args.body.status === 'visible') {
    // Unhiding can collide with a visible row that claimed this product's name+brand
    // while it was hidden. Pre-check surfaces that row (409 + details) instead
    // of a bare 23505. The full slug index keeps this product's slug reserved meanwhile.
    const [self] = await db
      .select({ name: products.name, brand: products.brand })
      .from(products)
      .where(eq(products.id, args.id))
      .limit(1)
    if (self) {
      const [conflict] = await db
        .select({
          id: products.id,
          name: products.name,
          brand: products.brand,
          slug: products.slug,
        })
        .from(products)
        .where(
          and(
            ne(products.id, args.id),
            eq(products.moderationStatus, 'visible'),
            sql`norm(${products.name}) = norm(${self.name})`,
            sql`norm(${products.brand}) = norm(${self.brand})`
          )
        )
        .limit(1)
      if (conflict) throw new ProductError('product_already_exists', conflict)
    }
  }
  try {
    const [row] = await db
      .update(products)
      .set(buildUpdates(args))
      .where(eq(products.id, args.id))
      .returning({
        id: products.id,
        moderationStatus: products.moderationStatus,
        moderationReason: products.moderationReason,
      })
    if (!row) return { success: false, error: 'not_found' }
    return { success: true, data: row }
  } catch (e) {
    // Re-throw so withRlsContext rolls back; a catch-and-return on an aborted tx would COMMIT it (500).
    translateUniqueViolation(e, () => new ProductError('product_already_exists'))
  }
}

export async function moderateIngredient(
  db: Database,
  args: ModerateArgs
): Promise<ModerateContentResult> {
  if (args.body.status === 'visible') {
    // Unhiding can collide with an ingredient that claimed this slug while hidden
    // (partial-visible slug index). Pre-check surfaces that row (409 + details).
    const [self] = await db
      .select({ slug: ingredients.slug })
      .from(ingredients)
      .where(eq(ingredients.id, args.id))
      .limit(1)
    if (self) {
      const [conflict] = await db
        .select({ id: ingredients.id, name: ingredients.name, slug: ingredients.slug })
        .from(ingredients)
        .where(
          and(
            ne(ingredients.id, args.id),
            eq(ingredients.moderationStatus, 'visible'),
            eq(ingredients.slug, self.slug)
          )
        )
        .limit(1)
      if (conflict) throw new IngredientError('ingredient_already_exists', conflict)
    }
  }
  try {
    const [row] = await db
      .update(ingredients)
      .set(buildUpdates(args))
      .where(eq(ingredients.id, args.id))
      .returning({
        id: ingredients.id,
        moderationStatus: ingredients.moderationStatus,
        moderationReason: ingredients.moderationReason,
      })
    if (!row) return { success: false, error: 'not_found' }
    return { success: true, data: row }
  } catch (e) {
    translateUniqueViolation(e, () => new IngredientError('ingredient_already_exists'))
  }
}

type ModerateProfileArgs = {
  targetUserId: string
  adminId: string
  body: ModerateProfileInput
}

export async function previewReview(db: Database, id: string): Promise<ContentPreviewResult> {
  const [row] = await db
    .select({
      id: userProductReviews.id,
      comment: userProductReviews.comment,
      moderationStatus: userProductReviews.moderationStatus,
      moderationReason: userProductReviews.moderationReason,
      createdAt: userProductReviews.createdAt,
      authorId: userProducts.userId,
      authorUsername: profiles.username,
    })
    .from(userProductReviews)
    .leftJoin(userProducts, eq(userProducts.id, userProductReviews.userProductId))
    .leftJoin(profiles, eq(profiles.userId, userProducts.userId))
    .where(eq(userProductReviews.id, id))
    .limit(1)
  if (!row) return { success: false, error: 'not_found' }
  return { success: true, data: { kind: 'review', ...row } }
}

export async function previewThread(db: Database, id: string): Promise<ContentPreviewResult> {
  const [row] = await db
    .select({
      id: discussionThreads.id,
      title: discussionThreads.title,
      content: discussionThreads.content,
      moderationStatus: discussionThreads.moderationStatus,
      moderationReason: discussionThreads.moderationReason,
      createdAt: discussionThreads.createdAt,
      authorId: discussionThreads.authorId,
      authorUsername: profiles.username,
    })
    .from(discussionThreads)
    .leftJoin(profiles, eq(profiles.userId, discussionThreads.authorId))
    .where(eq(discussionThreads.id, id))
    .limit(1)
  if (!row) return { success: false, error: 'not_found' }
  return { success: true, data: { kind: 'thread', ...row } }
}

export async function previewReply(db: Database, id: string): Promise<ContentPreviewResult> {
  const [row] = await db
    .select({
      id: discussionReplies.id,
      content: discussionReplies.content,
      moderationStatus: discussionReplies.moderationStatus,
      moderationReason: discussionReplies.moderationReason,
      createdAt: discussionReplies.createdAt,
      authorId: discussionReplies.authorId,
      authorUsername: profiles.username,
    })
    .from(discussionReplies)
    .leftJoin(profiles, eq(profiles.userId, discussionReplies.authorId))
    .where(eq(discussionReplies.id, id))
    .limit(1)
  if (!row) return { success: false, error: 'not_found' }
  return { success: true, data: { kind: 'reply', ...row } }
}

export async function previewProduct(db: Database, id: string): Promise<ContentPreviewResult> {
  const [row] = await db
    .select({
      id: products.id,
      name: products.name,
      brand: products.brand,
      slug: products.slug,
      moderationStatus: products.moderationStatus,
      moderationReason: products.moderationReason,
      createdAt: products.createdAt,
      authorId: products.createdBy,
      authorUsername: profiles.username,
    })
    .from(products)
    .leftJoin(profiles, eq(profiles.userId, products.createdBy))
    .where(eq(products.id, id))
    .limit(1)
  if (!row) return { success: false, error: 'not_found' }
  return { success: true, data: { kind: 'product', ...row } }
}

export async function previewIngredient(db: Database, id: string): Promise<ContentPreviewResult> {
  const [row] = await db
    .select({
      id: ingredients.id,
      name: ingredients.name,
      slug: ingredients.slug,
      moderationStatus: ingredients.moderationStatus,
      moderationReason: ingredients.moderationReason,
      createdAt: ingredients.createdAt,
      authorId: ingredients.createdBy,
      authorUsername: profiles.username,
    })
    .from(ingredients)
    .leftJoin(profiles, eq(profiles.userId, ingredients.createdBy))
    .where(eq(ingredients.id, id))
    .limit(1)
  if (!row) return { success: false, error: 'not_found' }
  return { success: true, data: { kind: 'ingredient', ...row } }
}

// withRlsContext binds the caller's role; the moderation select policy covers hidden rows, no admin bypass needed.
export async function listCatalogQueue(
  db: Database,
  filters: CatalogQueueQuery
): Promise<CatalogQueueResponse> {
  const status = filters.status ?? 'visible'
  if (filters.kind === 'product') {
    // Only constrain quality when explicitly requested: the hidden view passes no quality,
    // intending all hidden rows; a default would suppress verified-then-hidden entries.
    const qualityClause = filters.quality ? eq(products.catalogQuality, filters.quality) : undefined
    const rows = await db
      .select({
        id: products.id,
        name: products.name,
        brand: products.brand,
        slug: products.slug,
        catalogQuality: products.catalogQuality,
        moderationStatus: products.moderationStatus,
        authorId: products.createdBy,
        authorUsername: profiles.username,
        createdAt: products.createdAt,
      })
      .from(products)
      .leftJoin(profiles, eq(profiles.userId, products.createdBy))
      .where(and(qualityClause, eq(products.moderationStatus, status)))
      .orderBy(desc(products.createdAt))
    return { items: rows.map((r) => ({ kind: 'product' as const, ...r })) }
  }
  const qualityClause = filters.quality
    ? eq(ingredients.catalogQuality, filters.quality)
    : undefined
  const rows = await db
    .select({
      id: ingredients.id,
      name: ingredients.name,
      slug: ingredients.slug,
      catalogQuality: ingredients.catalogQuality,
      moderationStatus: ingredients.moderationStatus,
      authorId: ingredients.createdBy,
      authorUsername: profiles.username,
      createdAt: ingredients.createdAt,
    })
    .from(ingredients)
    .leftJoin(profiles, eq(profiles.userId, ingredients.createdBy))
    .where(and(qualityClause, eq(ingredients.moderationStatus, status)))
    .orderBy(desc(ingredients.createdAt))
  return { items: rows.map((r) => ({ kind: 'ingredient' as const, brand: null, ...r })) }
}

export async function moderateProfileVisibility(
  db: Database,
  args: ModerateProfileArgs
): Promise<ModerateProfileResult> {
  const updates = args.body.forcedPrivate
    ? {
        forcedPrivateByAdmin: true,
        forcedPrivateBy: args.adminId,
        forcedPrivateAt: nowISO(),
        forcedPrivateReason: args.body.reason ?? null,
      }
    : {
        forcedPrivateByAdmin: false,
        forcedPrivateBy: null,
        forcedPrivateAt: null,
        forcedPrivateReason: null,
      }

  const [row] = await db
    .update(profiles)
    .set(updates)
    .where(eq(profiles.userId, args.targetUserId))
    .returning({
      userId: profiles.userId,
      forcedPrivateByAdmin: profiles.forcedPrivateByAdmin,
      forcedPrivateReason: profiles.forcedPrivateReason,
    })
  if (!row) return { success: false, error: 'not_found' }
  return { success: true, data: row }
}
