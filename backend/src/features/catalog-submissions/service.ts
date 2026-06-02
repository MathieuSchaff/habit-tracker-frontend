import type { MySubmissionsResponse } from '@aurore/shared'

import { desc, eq } from 'drizzle-orm'

import { withAdminRls } from '../../db/rls'
import { ingredients, products } from '../../db/schema'

// Reads under admin RLS so hidden/moderated rows surface, but scoped strictly to the authed
// uid. The public select_visible policy would filter them out for a regular user.
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
