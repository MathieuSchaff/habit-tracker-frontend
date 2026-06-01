import type { MySubmissionsResponse } from '@aurore/shared'

import { desc, eq } from 'drizzle-orm'

import { withAdminRls } from '../../db/rls'
import { ingredients, products } from '../../db/schema'

// Owner-scoped: a user must see their OWN submissions incl. hidden ones + the
// moderation reason, which the public select_visible RLS policy filters for a plain
// user. We read under admin RLS, scoped strictly to the authed uid (no user-supplied
// filter), so hidden-own rows surface ONLY here — never in public catalog reads.
export async function getMySubmissions(userId: string): Promise<MySubmissionsResponse> {
  return withAdminRls(async (tx) => {
    const prods = await tx
      .select({
        id: products.id,
        name: products.name,
        brand: products.brand,
        slug: products.slug,
        catalogQuality: products.catalogQuality,
        moderationStatus: products.moderationStatus,
        moderationReason: products.moderationReason,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .where(eq(products.createdBy, userId))
      .orderBy(desc(products.createdAt))
    const ings = await tx
      .select({
        id: ingredients.id,
        name: ingredients.name,
        slug: ingredients.slug,
        catalogQuality: ingredients.catalogQuality,
        moderationStatus: ingredients.moderationStatus,
        moderationReason: ingredients.moderationReason,
        createdAt: ingredients.createdAt,
        updatedAt: ingredients.updatedAt,
      })
      .from(ingredients)
      .where(eq(ingredients.createdBy, userId))
      .orderBy(desc(ingredients.createdAt))
    const items = [
      ...prods.map((r) => ({ kind: 'product' as const, ...r })),
      ...ings.map((r) => ({ kind: 'ingredient' as const, brand: null, ...r })),
    ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    return { items }
  })
}
