// Audit: INCI quality across the seed corpus.
// Surfaces (1) top unmatched tokens, (2) worst-match products,
// (3) pathological INCI strings (preamble, encoding, very short, etc.).
// Run via: docker exec -w /app/backend -e DATABASE_URL='postgres://app:devpassword@app_db:5432/appdb' app_api bun src/db/seed/inci/audit-quality.ts
import { SQL } from 'bun'

import { normalize, splitINCI } from 'algo-derm'
import { buildAliasIndex, lookupIngredient, MERGED_EVIDENCE_DB } from 'algo-derm/engine'

const aliasIndex = buildAliasIndex(MERGED_EVIDENCE_DB)

const FR_MARKERS =
  /beurre de|huile de|extrait de|glycérine|parfum\/fragrance|fragrance\/parfum|aqua\/water\/eau|aqua\s*\(\s*eau|^eau\s*,|^eau\s|hydrolat|^parfum$/i
const PREAMBLE_RX = /^(ingredients?|ingrédients?|composition|inci)\s*[:-]/i
const HAS_MOJIBAKE = /Ã©|Ã¨|Ã |Ã´|Ã®/
const ENDS_TRUNCATED = /\.\.\.\s*$|…\s*$/

const sql = new SQL(process.env.DATABASE_URL ?? 'postgres://app:devpassword@app_db:5432/appdb')
const rows = await sql<
  Array<{ id: string; slug: string; inci: string; category: string; brand: string | null }>
>`
  SELECT id, slug, inci, category, brand
  FROM products
  WHERE inci IS NOT NULL AND length(inci) > 10
`

console.log(`Loaded ${rows.length} products with INCI.\n`)

type Pathology = 'preamble' | 'mojibake' | 'truncated' | 'very-short' | 'single-token' | 'no-comma'

const pathologyLists: Record<Pathology, Array<{ slug: string; sample: string }>> = {
  preamble: [],
  mojibake: [],
  truncated: [],
  'very-short': [],
  'single-token': [],
  'no-comma': [],
}

// Per-product match-rate
type ProductStat = {
  slug: string
  brand: string | null
  category: string
  isFr: boolean
  ingCount: number
  matched: number
  ratio: number
  unmatchedSample: string[]
}
const productStats: ProductStat[] = []

// Token frequencies
const unmatchedFR = new Map<string, number>()
const unmatchedNonFR = new Map<string, number>()

for (const { slug, inci, category, brand } of rows) {
  if (PREAMBLE_RX.test(inci)) pathologyLists.preamble.push({ slug, sample: inci.slice(0, 80) })
  if (HAS_MOJIBAKE.test(inci)) pathologyLists.mojibake.push({ slug, sample: inci.slice(0, 80) })
  if (ENDS_TRUNCATED.test(inci)) pathologyLists.truncated.push({ slug, sample: inci.slice(-80) })
  if (inci.length < 40) pathologyLists['very-short'].push({ slug, sample: inci })
  if (!inci.includes(',')) pathologyLists['no-comma'].push({ slug, sample: inci.slice(0, 80) })

  const ings = splitINCI(inci)
  if (ings.length === 1) pathologyLists['single-token'].push({ slug, sample: inci.slice(0, 80) })

  const isFr = FR_MARKERS.test(inci)
  let matched = 0
  const unmatchedHere: string[] = []
  for (const ing of ings) {
    const norm = normalize(ing)
    // Use lookupIngredient (not aliasIndex.has) so botanical-part strip
    // ("centella asiatica leaf extract" → "centella asiatica extract") fires —
    // matches real engine path. Otherwise we overcount unmatched on N-word
    // botanicals.
    if (lookupIngredient(ing, aliasIndex)) {
      matched++
    } else {
      unmatchedHere.push(ing)
      const target = isFr ? unmatchedFR : unmatchedNonFR
      target.set(norm, (target.get(norm) ?? 0) + 1)
    }
  }
  productStats.push({
    slug,
    brand,
    category,
    isFr,
    ingCount: ings.length,
    matched,
    ratio: ings.length > 0 ? matched / ings.length : 0,
    unmatchedSample: unmatchedHere.slice(0, 6),
  })
}

await sql.end()

// === Report 1: pathological INCI strings ===
console.log('='.repeat(70))
console.log('1. INCI pathologies (formatting/quality issues)')
console.log('='.repeat(70))
const SHOW_FULL = process.env.INCI_AUDIT_FULL === '1'
const SAMPLE_CAP = SHOW_FULL ? Number.POSITIVE_INFINITY : 8
for (const [name, list] of Object.entries(pathologyLists) as Array<
  [Pathology, typeof pathologyLists.preamble]
>) {
  console.log(`\n  ${name} — ${list.length} products`)
  for (const { slug, sample } of list.slice(0, SAMPLE_CAP)) console.log(`    ${slug} :: ${sample}`)
  if (!SHOW_FULL && list.length > SAMPLE_CAP)
    console.log(
      `    ... +${list.length - SAMPLE_CAP} more (rerun with INCI_AUDIT_FULL=1 for full list)`
    )
}

// === Report 2: top unmatched tokens ===
function topN(map: Map<string, number>, n: number) {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
}
console.log(`\n${'='.repeat(70)}`)
console.log('2. Top unmatched tokens (after normalize) — opportunity for parser/evidence')
console.log('='.repeat(70))
console.log('\n  FR products — top 40 unmatched')
for (const [tok, count] of topN(unmatchedFR, 40))
  console.log(`    ${String(count).padStart(4)} × ${tok}`)
console.log('\n  non-FR products — top 40 unmatched')
for (const [tok, count] of topN(unmatchedNonFR, 40))
  console.log(`    ${String(count).padStart(4)} × ${tok}`)

// === Report 3: worst-match products (skincare only, ≥10 ings) ===
console.log(`\n${'='.repeat(70)}`)
console.log('3. Worst-match skincare products (≥10 ings, sorted by ratio asc)')
console.log('='.repeat(70))
const worstSkincare = productStats
  .filter((p) => p.category === 'skincare' && p.ingCount >= 10)
  .sort((a, b) => a.ratio - b.ratio)
  .slice(0, 30)
console.log('\n  rank  ratio  matched/total  brand            slug')
worstSkincare.forEach((p, i) => {
  console.log(
    `  ${String(i + 1).padStart(2)}.   ${(p.ratio * 100).toFixed(1).padStart(5)}%  ${String(p.matched).padStart(3)}/${String(p.ingCount).padStart(3)}        ${(p.brand ?? '').padEnd(16)} ${p.slug}`
  )
  console.log(`         unmatched: ${p.unmatchedSample.join(' | ')}`)
})

// === Report 4: aggregate per brand ===
console.log(`\n${'='.repeat(70)}`)
console.log('4. Brand-level match-rate (skincare, ≥5 products)')
console.log('='.repeat(70))
const byBrand = new Map<string, { count: number; totalIngs: number; matched: number }>()
for (const p of productStats) {
  if (p.category !== 'skincare' || !p.brand) continue
  const cur = byBrand.get(p.brand) ?? { count: 0, totalIngs: 0, matched: 0 }
  cur.count++
  cur.totalIngs += p.ingCount
  cur.matched += p.matched
  byBrand.set(p.brand, cur)
}
const brandRows = Array.from(byBrand.entries())
  .filter(([, v]) => v.count >= 5)
  .map(([brand, v]) => ({ brand, count: v.count, ratio: v.matched / v.totalIngs }))
  .sort((a, b) => a.ratio - b.ratio)
console.log('\n  prods  ratio   brand')
for (const { brand, count, ratio } of brandRows.slice(0, 30)) {
  console.log(`  ${String(count).padStart(5)}  ${(ratio * 100).toFixed(1).padStart(5)}%  ${brand}`)
}
