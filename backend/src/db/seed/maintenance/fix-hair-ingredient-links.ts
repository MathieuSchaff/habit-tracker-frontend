#!/usr/bin/env bun

/**
 * fix-hair-ingredient-links.ts — repoint `-hair` shadow ingredient links on non-haircare
 * products to their canonical ingredient (audit §9 loose-end B, 2026-06-10).
 *
 * Step 5 moved ~44 klorane products out of haircare but left their product_ingredients
 * pointing at `-hair`-suffixed shadow ingredients (e.g. a now-skincare moisturizer linking
 * `glycerin-hair` instead of `glycerin`). The shadows are SHARED with genuine haircare
 * products and carry domain-specific tags, so they are NOT deleted — only the non-haircare
 * links are repointed onto the canonical entry those products' peers already use.
 *
 * Scope is the whole defect class: every `category <> 'haircare'` product linking a `-hair`
 * ingredient (45 products, 121 links as of 2026-06-10), not just the klorane subset — the
 * query is self-contained so it replays on prod without the .audit-out json.
 *
 * Two `-hair` ingredients have NO correct canonical and are deliberately skipped (mapping
 * them would be wrong chemistry / a missing row, worse than leaving the shadow link):
 *   - `sles-hair` (Sodium Laureth Sulfate): catalogue has SLS / ammonium salts, no SLES.
 *   - `olive-oil-hair`: the only olive entry; no `huile-olive` canonical exists.
 * The durable fix for those is the canonical resolution layer described in audit §9c.
 *
 * Usage:
 *   bun run src/db/seed/maintenance/fix-hair-ingredient-links.ts          # dry-run
 *   bun run src/db/seed/maintenance/fix-hair-ingredient-links.ts --write  # apply
 */

import { sql } from 'drizzle-orm'

import { db } from '../..'
import { withAdminRls } from '../../rls'

const WRITE = process.argv.includes('--write')

// `-hair` shadow slug -> canonical slug already used by the catalogue's skincare/bodycare rows.
// Schemes are mixed (English / French `huile-*` / INCI) — this is the catalogue's existing
// canonical for each substance, verified present 2026-06-10.
const CANON_MAP: [hair: string, canon: string][] = [
  ['tocopherol-hair', 'tocopherol'],
  ['glycerin-hair', 'glycerin'],
  ['sunflower-oil-hair', 'huile-graines-tournesol'],
  ['coconut-oil-hair', 'huile-coco'],
  ['pentylene-glycol-hair', 'pentylene-glycol'],
  ['safflower-oil-hair', 'huile-carthame'],
  ['cetearyl-alcohol-hair', 'cetearyl-alcohol'],
  ['sodium-hyaluronate-hair', 'sodium-hyaluronate'],
  ['aloe-vera-hair', 'aloe-vera'],
  ['betaine-hair', 'betaine'],
  ['butylene-glycol-hair', 'butylene-glycol'],
  ['squalane-hair', 'squalane'],
  ['argan-oil-hair', 'huile-argan'],
  ['biotin-hair', 'biotin'],
  ['castor-oil-hair', 'ricinus-communis-seed-oil'],
  ['cetyl-alcohol-hair', 'cetyl-alcohol'],
  ['jojoba-oil-hair', 'huile-jojoba'],
  ['kaolin-hair', 'kaolin'],
  ['niacinamide-hair', 'niacinamide'],
  ['xanthan-gum-hair', 'xanthan-gum'],
]

// no correct canonical — report only, never map
const UNMAPPED = ['sles-hair', 'olive-oil-hair']

const mapValues = sql.join(
  CANON_MAP.map(([h, c]) => sql`(${h}, ${c})`),
  sql`, `
)

// shadow slugs only — used to prune any that the repoint leaves at 0 product usage
const hairList = sql.join(
  CANON_MAP.map(([h]) => sql`${h}`),
  sql`, `
)

async function main() {
  // sanity: every canonical must exist, or the join silently drops links
  const missing = await db.execute(sql`
    WITH m(hair, canon) AS (VALUES ${mapValues})
    SELECT m.canon FROM m
    LEFT JOIN ingredients i ON i.slug = m.canon
    WHERE i.id IS NULL
  `)
  if (missing.length) {
    console.error(
      '! missing canonical ingredients, aborting:',
      missing.map((r) => r.canon)
    )
    process.exit(1)
  }

  // plan: per shadow, how many links repoint (no canonical link yet) vs dedup (collision)
  const plan = await db.execute(sql`
    WITH m(hair, canon) AS (VALUES ${mapValues})
    SELECT
      m.hair,
      count(*) FILTER (WHERE pc.id IS NULL)  AS repoint,
      count(*) FILTER (WHERE pc.id IS NOT NULL) AS dedup
    FROM m
    JOIN ingredients ih ON ih.slug = m.hair
    JOIN ingredients ic ON ic.slug = m.canon
    JOIN product_ingredients ph ON ph.ingredient_id = ih.id
    JOIN products p ON p.id = ph.product_id AND p.category <> 'haircare'
    LEFT JOIN product_ingredients pc ON pc.product_id = ph.product_id AND pc.ingredient_id = ic.id
    GROUP BY m.hair
    ORDER BY 2 DESC, 1
  `)

  let repoint = 0
  let dedup = 0
  for (const r of plan) {
    const rp = Number(r.repoint)
    const dd = Number(r.dedup)
    repoint += rp
    dedup += dd
    console.log(`  ${r.hair} → repoint ${rp}${dd ? `, dedup ${dd}` : ''}`)
  }

  const unmappedList = sql.join(
    UNMAPPED.map((s) => sql`${s}`),
    sql`, `
  )
  const skipped = await db.execute(sql`
    SELECT i.slug, count(*) AS links
    FROM product_ingredients pi
    JOIN products p ON p.id = pi.product_id AND p.category <> 'haircare'
    JOIN ingredients i ON i.id = pi.ingredient_id
    WHERE i.slug IN (${unmappedList})
    GROUP BY i.slug ORDER BY 1
  `)

  console.log(
    `\n# repoint ${repoint}, dedup ${dedup} (total ${repoint + dedup} links on ${CANON_MAP.length} shadows)`
  )
  console.log('# skipped (no correct canonical — see §9c):')
  for (const r of skipped) console.log(`  ${r.slug} → ${r.links} links left on shadow`)

  // shadows the repoint will strand: no remaining haircare usage + no RESTRICT FK (discussion_threads).
  // Such a shadow becomes a 0-usage dead row → safe to prune (cascades its tag-links/dermo).
  const orphans = await db.execute(sql`
    SELECT i.slug FROM ingredients i
    WHERE i.slug IN (${hairList})
      AND NOT EXISTS (
        SELECT 1 FROM product_ingredients pi
        JOIN products p ON p.id = pi.product_id
        WHERE pi.ingredient_id = i.id AND p.category = 'haircare'
      )
      AND NOT EXISTS (SELECT 1 FROM discussion_threads dt WHERE dt.ingredient_id = i.id)
    ORDER BY i.slug
  `)
  console.log(`# orphan shadows to prune after repoint: ${orphans.length}`)
  for (const r of orphans) console.log(`  ${r.slug}`)

  if (!WRITE) {
    console.log('\n[dry-run] re-run with --write to apply.')
    return
  }

  await withAdminRls(async (tx) => {
    // 1. drop collisions: product already links the canonical → delete the redundant shadow link
    await tx.execute(sql`
      WITH m(hair, canon) AS (VALUES ${mapValues})
      DELETE FROM product_ingredients ph
      USING ingredients ih, ingredients ic, products p, m
      WHERE ph.ingredient_id = ih.id AND ih.slug = m.hair
        AND ic.slug = m.canon
        AND p.id = ph.product_id AND p.category <> 'haircare'
        AND EXISTS (
          SELECT 1 FROM product_ingredients pc
          WHERE pc.product_id = ph.product_id AND pc.ingredient_id = ic.id
        )
    `)
    // 2. repoint the rest to the canonical id
    await tx.execute(sql`
      WITH m(hair, canon) AS (VALUES ${mapValues})
      UPDATE product_ingredients ph
      SET ingredient_id = ic.id
      FROM ingredients ih, ingredients ic, products p, m
      WHERE ph.ingredient_id = ih.id AND ih.slug = m.hair
        AND ic.slug = m.canon
        AND p.id = ph.product_id AND p.category <> 'haircare'
    `)
    // 3. prune shadows now at 0 usage (cascades dead tag-links / dermo); RESTRICT-FK rows excluded above
    await tx.execute(sql`
      DELETE FROM ingredients i
      WHERE i.slug IN (${hairList})
        AND NOT EXISTS (SELECT 1 FROM product_ingredients pi WHERE pi.ingredient_id = i.id)
        AND NOT EXISTS (SELECT 1 FROM discussion_threads dt WHERE dt.ingredient_id = i.id)
    `)
  })

  console.log(
    `\napplied: repointed ${repoint}, deduped ${dedup}, pruned ${orphans.length} orphan shadow(s).`
  )
}

await main()
process.exit(0)
