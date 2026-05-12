// Benchmark: FR-INCI match-rate before vs after parser FR layer.
// Runs inside the backend container (has algo-derm + DB env).
import { SQL } from 'bun'

import { splitINCI } from 'algo-derm'
import { buildAliasIndex, MERGED_EVIDENCE_DB, stripBotanicalParts } from 'algo-derm/engine'

// Mirror lookupIngredient: exact hit first, then botanical-strip fallback.
// Without this fallback we under-report matches on 4-word botanicals
// (e.g. "centella asiatica leaf extract" → strip "leaf" → matches DB entry).
const hits = (normalized: string): boolean => {
  if (aliasIndex.has(normalized)) return true
  const stripped = stripBotanicalParts(normalized)
  return stripped ? aliasIndex.has(stripped) : false
}

import { normalize as newNormalize } from 'algo-derm'

// Legacy normalize: the parser.ts function from BEFORE the FR layer.
// Inlined verbatim so we can compare matching with the same alias index.
const legacyNormalize = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[\\/]/g, ' ')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const aliasIndex = buildAliasIndex(MERGED_EVIDENCE_DB)
console.log(
  `Alias index built: ${aliasIndex.size} keys, ${Object.keys(MERGED_EVIDENCE_DB).length} evidence entries.`
)

const FR_MARKERS =
  /beurre de|huile de|extrait de|glycérine|parfum\/fragrance|fragrance\/parfum|aqua\/water\/eau|aqua\s*\(\s*eau|^eau\s*,|^eau\s|hydrolat|^parfum$/i

const sql = new SQL(process.env.DATABASE_URL ?? 'postgres://app:devpassword@app_db:5432/appdb')
const rows = await sql`
  SELECT id, slug, inci, category
  FROM products
  WHERE inci IS NOT NULL AND length(inci) > 10
`
console.log(`Loaded ${rows.length} products with INCI.`)

type Bucket = {
  name: string
  prodCount: number
  ingTotal: number
  legacyMatch: number
  newMatch: number
  legacyFullCov: number
  newFullCov: number
}
const buckets: Record<string, Bucket> = {
  fr_skincare: {
    name: 'FR skincare',
    prodCount: 0,
    ingTotal: 0,
    legacyMatch: 0,
    newMatch: 0,
    legacyFullCov: 0,
    newFullCov: 0,
  },
  fr_other: {
    name: 'FR other',
    prodCount: 0,
    ingTotal: 0,
    legacyMatch: 0,
    newMatch: 0,
    legacyFullCov: 0,
    newFullCov: 0,
  },
  nonfr: {
    name: 'non-FR',
    prodCount: 0,
    ingTotal: 0,
    legacyMatch: 0,
    newMatch: 0,
    legacyFullCov: 0,
    newFullCov: 0,
  },
}

const exampleGains: Array<{ slug: string; before: string[]; after: string[] }> = []

for (const { slug, inci, category } of rows) {
  const isFr = FR_MARKERS.test(inci)
  const bucket = isFr
    ? category === 'skincare'
      ? buckets.fr_skincare
      : buckets.fr_other
    : buckets.nonfr
  bucket.prodCount++

  const ingredients = splitINCI(inci)
  bucket.ingTotal += ingredients.length

  let prodLegacyMatch = 0
  let prodNewMatch = 0
  const gainedHere: string[] = []
  const lostHere: string[] = []

  for (const ing of ingredients) {
    const legHit = hits(legacyNormalize(ing))
    const newHit = hits(newNormalize(ing))
    if (legHit) {
      bucket.legacyMatch++
      prodLegacyMatch++
    }
    if (newHit) {
      bucket.newMatch++
      prodNewMatch++
    }
    if (!legHit && newHit) gainedHere.push(ing)
    if (legHit && !newHit) lostHere.push(ing)
  }

  if (prodLegacyMatch === ingredients.length) bucket.legacyFullCov++
  if (prodNewMatch === ingredients.length) bucket.newFullCov++

  if (isFr && gainedHere.length >= 5 && exampleGains.length < 5) {
    exampleGains.push({ slug, before: lostHere.slice(0, 3), after: gainedHere.slice(0, 5) })
  }
}

await sql.end()

console.log('\n=== Match-rate (alias index hits / total ingredients) ===\n')
console.log(
  'bucket'.padEnd(15),
  'prods'.padStart(7),
  'ings'.padStart(7),
  'legacy'.padStart(8),
  'new'.padStart(8),
  'Δ%'.padStart(7)
)
for (const b of Object.values(buckets)) {
  const legPct = ((100 * b.legacyMatch) / b.ingTotal).toFixed(1)
  const newPct = ((100 * b.newMatch) / b.ingTotal).toFixed(1)
  const delta = ((100 * (b.newMatch - b.legacyMatch)) / b.ingTotal).toFixed(1)
  console.log(
    b.name.padEnd(15),
    String(b.prodCount).padStart(7),
    String(b.ingTotal).padStart(7),
    `${legPct}%`.padStart(8),
    `${newPct}%`.padStart(8),
    `+${delta}`.padStart(7)
  )
}

console.log('\n=== Full-coverage products (every ingredient matched) ===\n')
for (const b of Object.values(buckets)) {
  const legPct = ((100 * b.legacyFullCov) / b.prodCount).toFixed(1)
  const newPct = ((100 * b.newFullCov) / b.prodCount).toFixed(1)
  console.log(
    `  ${b.name.padEnd(15)}  legacy ${legPct}% (${b.legacyFullCov}/${b.prodCount})  →  new ${newPct}% (${b.newFullCov}/${b.prodCount})`
  )
}

console.log('\n=== Example FR products with biggest gains (≥5 newly-matched) ===\n')
for (const ex of exampleGains) {
  console.log(`  ${ex.slug}`)
  console.log(`    gained: ${ex.after.join(' | ')}`)
  if (ex.before.length) console.log(`    lost:   ${ex.before.join(' | ')}`)
}
