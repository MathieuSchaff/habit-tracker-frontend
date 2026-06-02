import type { MySubmissionsResponse } from '@aurore/shared'

import { desc, eq, sql } from 'drizzle-orm'

import type { Database } from '../../db'
import { ingredients, products } from '../../db/schema'

// Owner-scoped read of own catalog rows, hidden ones included. Runs under the request's
// RLS context (regular role, not admin): the select_visible policy reveals own hidden rows
// only while app.own_submissions is set, so this flag — scoped to created_by = auth.uid()
// at the DB layer — is what surfaces them. The createdBy filter below is then RLS-backed
// defence-in-depth rather than the lone guard against leaking other users' hidden rows.
export async function getMySubmissions(
  db: Database,
  userId: string
): Promise<MySubmissionsResponse> {
  await db.execute(sql`SELECT set_config('app.own_submissions', 'on', true)`)
  // Sequential, not Promise.all: both queries share the one request-tx connection, and
  // concurrent statements on a single Bun SQL connection can misroute result sets.
  const prods = await db
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
  const ings = await db
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
  ].sort((a, b) => (a.createdAt > b.createdAt ? -1 : a.createdAt < b.createdAt ? 1 : 0))
  return { items }
}
