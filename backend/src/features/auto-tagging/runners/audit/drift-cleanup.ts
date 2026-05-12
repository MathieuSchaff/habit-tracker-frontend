// One-shot cleanup — remove manual cluster tags identified as false positives
// by drift-classify.ts (no INCI evidence of the actif in the formula).
//
// Each entry was reviewed against the full product INCI; see the audit log in
// /tmp/drift-fp.txt (run drift-classify.ts with DUMP_FALSE_POS=1).
//
// Dry-run by default. Set APPLY=1 to commit the deletes.

import { and, eq, sql } from 'drizzle-orm'

import { db } from '../../../../db'
import { products, productTagsDefs, tagProducts } from '../../../../db/schema'

const APPLY = process.env.APPLY === '1'

// (productSlug, tagSlug) pairs to remove. 17 rows / 15 products.
const TO_DELETE: Array<{ product: string; tag: string; reason: string }> = [
  {
    product: 'purito-mighty-bamboo-panthenol-cream',
    tag: 'retinoids',
    reason: 'no retinol/retinyl in INCI',
  },
  {
    product: 'bee-pollen-renew-ampouler',
    tag: 'vitamin-e',
    reason: 'no tocopherol/tocopheryl in INCI',
  },
  {
    product: 'bee-pollen-renew-ampouler',
    tag: 'polyphenols',
    reason: 'only theobroma cacao (not in patterns) — no canonical polyphenol',
  },
  {
    product: 'skinfood-rice-daily-brightening-cleansing',
    tag: 'hyaluronic-acid',
    reason: 'no hyaluron in INCI',
  },
  {
    product: 'haruharu-wonder-black-rice-5-ceramide-barrier-moisturizing-cream',
    tag: 'hyaluronic-acid',
    reason: 'no hyaluron in INCI',
  },
  {
    product: 'medicube-pdrn-pink-collagen-toning-gel-toner-pad',
    tag: 'peptides',
    reason: 'sodium DNA + collagen, no peptide INCI listing',
  },
  {
    product: 'medicube-pdrn-booster-gel',
    tag: 'peptides',
    reason: 'sodium DNA + collagen, no peptide INCI listing',
  },
  {
    product: 'missha-time-revolution-immortal-youth-cream-2x',
    tag: 'peptides',
    reason: 'no peptide INCI listing',
  },
  {
    product: 'pyunkang-yul-calming-moisture-serum',
    tag: 'peptides',
    reason: 'no peptide INCI listing',
  },
  {
    product: 'aestura-regederm-365-skin-tightening-capsule-serum',
    tag: 'peptides',
    reason: 'hydrolyzed extensin only (plant protein, not a peptide actif)',
  },
  {
    product: 'aestura-regederm-365-intensive-lifting-capsule-cream',
    tag: 'peptides',
    reason: 'hydrolyzed extensin only (plant protein, not a peptide actif)',
  },
  {
    product: 'missha-all-around-safe-block-aqua-sun-gel-spf50-pa',
    tag: 'polyphenols',
    reason: 'SPF formulation, no polyphenol pattern match',
  },
  {
    product: 'missha-all-around-safe-block-aqua-sun-gel-spf50-pa',
    tag: 'tyrosinase-inhibitors',
    reason: 'SPF formulation, no tyrosinase inhibitor',
  },
  {
    product: 'missha-superfood-lip-oil',
    tag: 'polyphenols',
    reason: 'persea gratissima oil only (not in patterns)',
  },
  {
    product: 'pyunkang-yul-deep-nourishing-multi-balm',
    tag: 'ceramides',
    reason: 'generic "Céramide" only (no NP/AP/etc variant per algo policy)',
  },
  {
    product: 'anua-heartleaf-pore-clay-pack',
    tag: 'ceramides',
    reason: 'generic "Céramide" only (no NP/AP/etc variant per algo policy)',
  },
  {
    product: 'mixsoon-soybean-milk-pad',
    tag: 'ceramides',
    reason: 'generic "Céramide" only (no NP/AP/etc variant per algo policy)',
  },
  {
    product: 'cosrx-retinol-01-cream',
    tag: 'retinoids',
    reason:
      'no retinol/retinyl/retinaldehyde in INCI (ascorbic + glutathione + beta-carotene line — marketing name does not reflect formula)',
  },
  {
    product: 'garancia-trousse-voyage-2025-303627',
    tag: 'vitamin-c',
    reason: 'travel kit INCI = single cream (cetearyl/glyceryl/oils) — no ascorbic anywhere',
  },
  {
    product: 'garancia-trousse-voyage-2025-303627',
    tag: 'hyaluronic-acid',
    reason: 'travel kit INCI = single cream — no hyaluronate anywhere',
  },
  {
    product: 'garancia-trousse-voyage-2025-303627',
    tag: 'peptides',
    reason: 'travel kit INCI = single cream — no peptide listing',
  },
]

async function main() {
  console.log(
    `🧹 Cleanup ${TO_DELETE.length} drift tag-products (${APPLY ? 'APPLY' : 'DRY-RUN'})\n`
  )

  await db.execute(sql`SET LOCAL app.role = 'admin'`)

  let removed = 0
  let missing = 0

  for (const row of TO_DELETE) {
    const product = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, row.product))
      .limit(1)
    if (product.length === 0) {
      console.log(`  ⚠️  product not found: ${row.product}`)
      missing++
      continue
    }
    const tagDef = await db
      .select({ id: productTagsDefs.id })
      .from(productTagsDefs)
      .where(eq(productTagsDefs.slug, row.tag))
      .limit(1)
    if (tagDef.length === 0) {
      console.log(`  ⚠️  tag def not found: ${row.tag}`)
      missing++
      continue
    }

    if (APPLY) {
      const result = await db
        .delete(tagProducts)
        .where(
          and(
            eq(tagProducts.productId, product[0]!.id),
            eq(tagProducts.productTagId, tagDef[0]!.id)
          )
        )
      const count = (result as unknown as { count: number }).count ?? 0
      console.log(`  ${count > 0 ? '✓' : '○'} ${row.product} ← ${row.tag} (${row.reason})`)
      removed += count
    } else {
      // Dry-run: just check existence
      const exists = await db
        .select({ pId: tagProducts.productId })
        .from(tagProducts)
        .where(
          and(
            eq(tagProducts.productId, product[0]!.id),
            eq(tagProducts.productTagId, tagDef[0]!.id)
          )
        )
        .limit(1)
      console.log(`  ${exists.length > 0 ? '→' : '○'} ${row.product} ← ${row.tag} (${row.reason})`)
      if (exists.length > 0) removed++
    }
  }

  console.log(
    `\n${APPLY ? '✅ Removed' : '🔎 Would remove'}: ${removed}/${TO_DELETE.length}  ·  not found: ${missing}`
  )
  if (!APPLY) console.log(`Set APPLY=1 to commit.`)
}

if (import.meta.main || process.argv[1]?.endsWith('drift-cleanup.ts')) {
  main().catch((err) => {
    console.error('\n💥 Erreur :', err instanceof Error ? err.message : err)
    if (err instanceof Error && err.stack) console.error(err.stack)
    process.exit(1)
  })
}
