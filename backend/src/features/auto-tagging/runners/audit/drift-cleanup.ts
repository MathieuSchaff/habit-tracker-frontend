// Remove manual cluster tags identified as false positives by drift-classify.ts
// (no INCI evidence of the actif). Each entry reviewed against full INCI;
// see /tmp/drift-fp.txt (DUMP_FALSE_POS=1). Dry-run by default; APPLY=1 commits.

import { and, eq } from 'drizzle-orm'

import { withAdminRls } from '../../../../db/rls'
import { products, productTagLinks, productTagTypes } from '../../../../db/schema'
import { exitOnError } from '../cli-args'

const APPLY = process.env.APPLY === '1'

// (productSlug, tagSlug) pairs to remove.
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

  let removed = 0
  let missing = 0

  // withAdminRls: bare SET LOCAL outside a tx is a no-op (RLS would reject DELETEs).
  await withAdminRls(async (tx) => {
    for (const row of TO_DELETE) {
      const productRow = await tx
        .select({ id: products.id })
        .from(products)
        .where(eq(products.slug, row.product))
        .limit(1)
      if (productRow.length === 0) {
        console.log(`  ⚠️  product not found: ${row.product}`)
        missing++
        continue
      }
      const tagTypeRow = await tx
        .select({ id: productTagTypes.id })
        .from(productTagTypes)
        .where(eq(productTagTypes.slug, row.tag))
        .limit(1)
      if (tagTypeRow.length === 0) {
        console.log(`  ⚠️  tag def not found: ${row.tag}`)
        missing++
        continue
      }

      if (APPLY) {
        const result = await tx
          .delete(productTagLinks)
          .where(
            and(
              eq(productTagLinks.productId, productRow[0]?.id),
              eq(productTagLinks.productTagId, tagTypeRow[0]?.id)
            )
          )
        const count = (result as unknown as { count: number }).count ?? 0
        console.log(`  ${count > 0 ? '✓' : '○'} ${row.product} ← ${row.tag} (${row.reason})`)
        removed += count
      } else {
        const exists = await tx
          .select({ pId: productTagLinks.productId })
          .from(productTagLinks)
          .where(
            and(
              eq(productTagLinks.productId, productRow[0]?.id),
              eq(productTagLinks.productTagId, tagTypeRow[0]?.id)
            )
          )
          .limit(1)
        console.log(
          `  ${exists.length > 0 ? '→' : '○'} ${row.product} ← ${row.tag} (${row.reason})`
        )
        if (exists.length > 0) removed++
      }
    }
  })

  console.log(
    `\n${APPLY ? '✅ Removed' : '🔎 Would remove'}: ${removed}/${TO_DELETE.length}  ·  not found: ${missing}`
  )
  if (!APPLY) console.log(`Set APPLY=1 to commit.`)
}

if (import.meta.main) {
  main().catch(exitOnError)
}
