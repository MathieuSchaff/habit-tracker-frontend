#!/usr/bin/env bun

/**
 * fix-klorane-stale-tags.ts — one-off catalogue cleanup (2026-06-09).
 *
 * Step 5 reclassified 7 klorane products that STAYED haircare but got a corrected kind
 * (shampoo/styling/hair-mask/hair-serum). Their seed tag blocks were rewritten to the
 * correct product_type, but `db-seed` is additive (never deletes), so the DB kept the old
 * manual `shampooing` / `apres-shampooing` product_type link. It is domain-valid (haircare
 * allows product_type) so `catalog-fix-tag-domain` left it untouched — a semantic mismatch
 * (a hair-serum tagged "shampooing"). The seed is already clean, so this is a DB-only delete
 * with no reseed-reintroduction risk.
 *
 * Removes only `source='manual'` links, never auto-tag rows.
 *
 * Usage:
 *   bun run src/db/seed/maintenance/fix-klorane-stale-tags.ts          # dry-run
 *   bun run src/db/seed/maintenance/fix-klorane-stale-tags.ts --write  # apply
 */

import { and, eq } from 'drizzle-orm'

import { db } from '../..'
import { withAdminRls } from '../../rls'
import { products, productTagLinks, productTagTypes } from '../../schema'

const WRITE = process.argv.includes('--write')

// productSlug -> stale product_type tag slug to remove (contradicts the corrected kind)
const STALE: { slug: string; tag: string }[] = [
  { slug: 'klorane-junior-shampoing-demelant-peche-500ml-275496', tag: 'apres-shampooing' },
  { slug: 'klorane-bebe-calendula-shampoing-demelant-200ml-275073', tag: 'apres-shampooing' },
  {
    slug: 'klorane-beurre-de-mangue-creme-de-jour-cheveux-nutrition-125ml-275206',
    tag: 'apres-shampooing',
  },
  {
    slug: 'klorane-galanga-lotion-anti-demangeaisons-antipelliculaire-100ml-302478',
    tag: 'shampooing',
  },
  {
    slug: 'klorane-figuier-de-barbarie-masque-repulpant-72h-hydratation-brillance-250ml-275651',
    tag: 'shampooing',
  },
  { slug: 'klorane-cupuacu-cica-serum-reparateur-100ml-275334', tag: 'shampooing' },
  {
    slug: 'klorane-figuier-de-barbarie-serum-ultra-desalterant-72h-hydratation-brillance-100ml-275650',
    tag: 'shampooing',
  },
]

async function main() {
  const plan: { productId: string; tagId: string; slug: string; tag: string }[] = []

  for (const { slug, tag } of STALE) {
    const p = await db.select({ id: products.id }).from(products).where(eq(products.slug, slug))
    if (!p.length) {
      console.log(`  ! product not found: ${slug}`)
      continue
    }
    const t = await db
      .select({ id: productTagTypes.id })
      .from(productTagTypes)
      .where(eq(productTagTypes.slug, tag))
    if (!t.length) {
      console.log(`  ! tag type not found: ${tag}`)
      continue
    }
    const link = await db
      .select({ src: productTagLinks.source })
      .from(productTagLinks)
      .where(
        and(
          eq(productTagLinks.productId, p[0].id),
          eq(productTagLinks.productTagId, t[0].id),
          eq(productTagLinks.source, 'manual')
        )
      )
    if (!link.length) {
      console.log(`  · already gone: ${slug} → ${tag}`)
      continue
    }
    console.log(`  - ${slug} → drop manual "${tag}"`)
    plan.push({ productId: p[0].id, tagId: t[0].id, slug, tag })
  }

  console.log(`\n# stale manual product_type links to delete: ${plan.length}`)

  if (!WRITE) {
    console.log('[dry-run] re-run with --write to apply.')
    return
  }

  await withAdminRls(async (tx) => {
    for (const r of plan) {
      await tx
        .delete(productTagLinks)
        .where(
          and(
            eq(productTagLinks.productId, r.productId),
            eq(productTagLinks.productTagId, r.tagId),
            eq(productTagLinks.source, 'manual')
          )
        )
    }
  })

  console.log(`applied: deleted ${plan.length} stale links.`)
}

await main()
process.exit(0)
