// Absence-claim justesse audit for `sans-sulfates` (report obs 3, report-only).
//
// algo-derm withholds the `sans-sulfates` absence claim whenever ANY token in its
// `sulfate_surfactant` group is present (lauryl/laureth/myreth/coco/cetearyl/coceth
// sulfate, mirrored in step-nettoyage-1.ts IONIC_SURFACTANT_PATTERNS). But
// `cetearyl sulfate` (sodium cetearyl sulfate) is a co-emulsifier, not a washing
// sulfate — the "sulfate-free" claim consumers care about targets SLS/SLES. So a
// leave-on cream whose only sulfate token is cetearyl is wrongly DENIED the claim
// = false negative. `coceth sulfate` is milder/ambiguous: flagged separately.
//
// Bug B (a real washing sulfate on a leave-on kind = product-kind mistag) is the
// reverse rule already covered by kind-inci-coherence.ts; products carrying a
// washing sulfate are excluded here so the two audits don't overlap.
//
// Read-only. Cleansers are skipped (washing sulfates are legitimate there).
// Usage: bun run .../sans-sulfates-coherence.ts

import { eq } from 'drizzle-orm'

import { db } from '../../../../db'
import { productTagLinks, productTagTypes } from '../../../../db/schema'
import { resolveIngredients } from '../../lib/ingredient-resolver'
import { IONIC_SURFACTANT_PATTERNS } from '../../passes/formula/step-nettoyage-1'

const SANS_SULFATES_SLUG = 'sans-sulfates'

// Partition the algo-derm group. Olefin sulfonate is not a sulfate (dropped).
const EMULSIFIER = ['cetearyl sulfate'] // co-emulsifier, not a washing sulfate
const COCETH = ['coceth sulfate'] // milder anionic, ambiguous — review
const WASHING = IONIC_SURFACTANT_PATTERNS.filter(
  (p) => p.includes('sulfate') && !EMULSIFIER.includes(p) && !COCETH.includes(p)
)

type Group = 'emulsifier' | 'coceth' | 'washing'

interface SulfateHit {
  token: string
  position: number
  group: Group
}

function classify(ing: string): Group | null {
  if (EMULSIFIER.some((p) => ing.includes(p))) return 'emulsifier'
  if (COCETH.some((p) => ing.includes(p))) return 'coceth'
  if (WASHING.some((p) => ing.includes(p))) return 'washing'
  return null
}

async function main() {
  const tagRows = await db
    .select({ pId: productTagLinks.productId, slug: productTagTypes.slug })
    .from(productTagLinks)
    .innerJoin(productTagTypes, eq(productTagLinks.productTagId, productTagTypes.id))
    .where(eq(productTagTypes.slug, SANS_SULFATES_SLUG))
  const hasSansSulfates = new Set<string>(tagRows.map((r) => r.pId))

  // fetchEligibleProducts is admin-elevated; reuse it to see hidden rows too.
  const { fetchEligibleProducts } = await import('./db')
  const subset = await fetchEligibleProducts({ categories: ['skincare'] })

  // Bug A buckets: non-cleanser products whose sulfate tokens are ALL emulsifier /
  // coceth (no washing sulfate) → wrongly denied the absence claim.
  const cetearyl: Array<{
    slug: string
    kind: string
    hits: SulfateHit[]
    tagged: boolean
    inci: string
  }> = []
  const cocethOnly: typeof cetearyl = []

  let scanned = 0
  for (const p of subset) {
    if (p.kind === 'cleanser') continue
    if (!p.inci?.trim()) continue
    scanned++

    const ingredients = resolveIngredients(p.inci).filter(Boolean)
    const hits: SulfateHit[] = []
    ingredients.forEach((ing, i) => {
      const g = classify(ing)
      if (g) hits.push({ token: ing, position: i, group: g })
    })
    if (hits.length === 0) continue
    // A washing sulfate makes this a real-sulfate / kind-mistag case (Bug B) — out of scope.
    if (hits.some((h) => h.group === 'washing')) continue

    const row = {
      slug: p.slug,
      kind: p.kind ?? 'unknown',
      hits,
      tagged: hasSansSulfates.has(p.id),
      inci: p.inci,
    }
    if (hits.some((h) => h.group === 'emulsifier')) cetearyl.push(row)
    else cocethOnly.push(row)
  }

  console.log('🧼 sans-sulfates absence-claim justesse (report-only, obs 3)\n')
  console.log(
    `   ${scanned} produits non-cleanser avec INCI · ${cetearyl.length} cetearyl-émulsifiant · ${cocethOnly.length} coceth-seul\n`
  )

  const dump = (label: string, rows: typeof cetearyl) => {
    if (rows.length === 0) return
    // FN = denied the claim despite no washing sulfate.
    const fn = rows.filter((r) => !r.tagged).length
    console.log(`── ${label} (${rows.length}, dont ${fn} sans le tag sans-sulfates = FN) ──`)
    for (const r of rows.sort((a, b) => a.slug.localeCompare(b.slug))) {
      const trig = r.hits.map((h) => `${h.token}@${h.position + 1}`).join(', ')
      console.log(`  [${r.kind}] ${r.slug}${r.tagged ? ' (a déjà sans-sulfates)' : ''}`)
      console.log(`     ${trig}`)
      const snip = r.inci.slice(0, 160)
      console.log(`     ${snip}${r.inci.length > 160 ? '…' : ''}`)
    }
    console.log()
  }

  dump('Bug A — cetearyl sulfate = émulsifiant (devrait être sans-sulfates)', cetearyl)
  dump('coceth sulfate seul — à trancher (washing ou non ?)', cocethOnly)

  if (cetearyl.length === 0 && cocethOnly.length === 0) {
    console.log('✓ aucun faux négatif émulsifiant détecté')
  } else {
    console.log(
      '  Fix = retirer cetearyl (et trancher coceth) du groupe sulfate_surfactant pour le claim'
    )
    console.log('  d’absence (algo-derm + step-nettoyage-1.ts), puis re-backfill sans-sulfates.')
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
