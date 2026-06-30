// Regression guard for `sans-sulfates` on CLEANSERS (report-only).
//
// `sans-sulfates` is a CLEANSER-ONLY absence claim: algo-derm withholds it on
// every other kind via `relevantKinds: ["cleanser", "gentle_cleanser"]`
// (absence.ts) — the claim only discriminates where a washing sulfate could
// occur. So a leave-on cream carrying `sodium cetearyl sulfate` is correctly
// NOT tagged; flagging it would be a false FN (the bug this file used to have).
//
// The real failure mode this guards: a CLEANSER whose only sulfate token is
// `cetearyl sulfate` (a C16-18 fatty-alcohol co-emulsifier, not a foaming
// washing sulfate) being DENIED the claim. algo-derm already excludes `cetearyl`
// from its `sulfate_surfactant` heuristic group, so this should report 0 FN; a
// non-zero count means that exclusion regressed. `coceth sulfate` is
// milder/ambiguous and reported separately for review.
//
// A cleanser carrying a real washing sulfate (SLS/SLES) legitimately loses the
// claim and is excluded. Read-only.
// Usage: bun run .../sans-sulfates-coherence.ts

import { eq } from 'drizzle-orm'

import { db } from '../../../../db'
import { productTagLinks, productTagTypes } from '../../../../db/schema'
import { resolveIngredients } from '../../lib/ingredient-resolver'
import { IONIC_SURFACTANT_PATTERNS } from '../../passes/formula/step-nettoyage-1'

const SANS_SULFATES_SLUG = 'sans-sulfates'

// Partition the canonical sulfate token list. Olefin sulfonate is not a sulfate.
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

  // The claim is cleanser-only, so it can only be wrongly denied on a cleanser.
  // A cleanser whose sulfate tokens are ALL emulsifier/coceth (no washing
  // sulfate) but lacks the tag = false negative.
  const emulsifierOnly: Array<{
    slug: string
    kind: string
    hits: SulfateHit[]
    tagged: boolean
    inci: string
  }> = []
  const cocethOnly: typeof emulsifierOnly = []

  let scanned = 0
  for (const p of subset) {
    if (p.kind !== 'cleanser') continue
    if (!p.inci?.trim()) continue
    scanned++

    const ingredients = resolveIngredients(p.inci).filter(Boolean)
    const hits: SulfateHit[] = []
    ingredients.forEach((ing, i) => {
      const g = classify(ing)
      if (g) hits.push({ token: ing, position: i, group: g })
    })
    if (hits.length === 0) continue
    // A washing sulfate legitimately breaks the claim — out of scope.
    if (hits.some((h) => h.group === 'washing')) continue

    const row = {
      slug: p.slug,
      kind: p.kind ?? 'unknown',
      hits,
      tagged: hasSansSulfates.has(p.id),
      inci: p.inci,
    }
    if (hits.some((h) => h.group === 'emulsifier')) emulsifierOnly.push(row)
    else cocethOnly.push(row)
  }

  console.log('🧼 sans-sulfates regression guard — cleansers (report-only)\n')
  console.log(
    `   ${scanned} cleansers avec INCI · ${emulsifierOnly.length} cetearyl-émulsifiant · ${cocethOnly.length} coceth-seul\n`
  )

  const dump = (label: string, rows: typeof emulsifierOnly) => {
    if (rows.length === 0) return
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

  dump('cetearyl sulfate seul = émulsifiant (cleanser doit garder sans-sulfates)', emulsifierOnly)
  dump('coceth sulfate seul — à trancher (washing ou non ?)', cocethOnly)

  const fnCount = emulsifierOnly.filter((r) => !r.tagged).length
  if (emulsifierOnly.length === 0 && cocethOnly.length === 0) {
    console.log('✓ aucun cleanser à sulfate-émulsifiant seul')
  } else if (fnCount === 0) {
    console.log('✓ aucun faux négatif : cetearyl bien exclu du heuristic sulfate_surfactant')
  } else {
    console.log(
      `⚠ ${fnCount} cleanser(s) privé(s) de sans-sulfates par un émulsifiant — l’exclusion cetearyl`
    )
    console.log('  du groupe sulfate_surfactant (algo-derm heuristic_rules.json) a régressé.')
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
