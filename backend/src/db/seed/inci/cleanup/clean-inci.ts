// One-shot: repair scraper-damaged products.inci with algo-derm cleanInciString
// (leading labels, broken separators, marketing/legal prose). Supersedes the
// former preamble / separators / prose / trailing-prose scripts — that logic now
// lives in algo-derm so any consumer (seed import, dermo-score, auto-tagging)
// shares one cleaner.
//
// Guardrail: skip rows whose cleaned INCI drops below 3 tokens or under 50% of
// the original token count (defensive against a transform eating the list).
// Dry-run by default. Pass --apply to UPDATE.
//
// Not covered here (separate runners): resplit-single-token.ts (index-based
// re-split of separator-free blobs) and worst-match-prose.ts (per-slug fixes).
import { SQL } from 'bun'

import { cleanInciString, splitINCI, stripPreamble } from 'algo-derm'

const apply = process.argv.includes('--apply')

const tokensOf = (inci: string): number => splitINCI(stripPreamble(inci)).length

const sql = new SQL(process.env.DATABASE_URL ?? 'postgres://app:devpassword@app_db:5432/appdb')

const rows = await sql<Array<{ id: string; slug: string; inci: string }>>`
  SELECT id, slug, inci FROM products WHERE inci IS NOT NULL
`

console.log(`Scanning ${rows.length} products with INCI.\n`)

let touched = 0
let skippedGuardrail = 0
let skippedNoop = 0
const previews: Array<{ slug: string; before: string; after: string }> = []
const guardrailDrops: Array<{
  slug: string
  before: string
  after: string
  tokensBefore: number
  tokensAfter: number
}> = []

for (const row of rows) {
  const final = cleanInciString(row.inci)
  if (final === row.inci) {
    skippedNoop++
    continue
  }

  const tBefore = tokensOf(row.inci)
  const tAfter = tokensOf(final)
  if (tAfter < 3 || tAfter * 2 < tBefore) {
    skippedGuardrail++
    if (guardrailDrops.length < 6)
      guardrailDrops.push({
        slug: row.slug,
        before: row.inci.slice(0, 160),
        after: final.slice(0, 160),
        tokensBefore: tBefore,
        tokensAfter: tAfter,
      })
    continue
  }

  touched++
  if (previews.length < 12)
    previews.push({
      slug: row.slug,
      before: row.inci.slice(0, 180),
      after: final.slice(0, 180),
    })

  if (apply) await sql`UPDATE products SET inci = ${final} WHERE id = ${row.id}`
}

console.log(`Touched: ${touched}`)
console.log(`Skipped noop: ${skippedNoop}`)
console.log(`Skipped guardrail (token count halved): ${skippedGuardrail}`)

console.log(`\n=== Previews ===`)
for (const p of previews) {
  console.log(`\n  ${p.slug}`)
  console.log(`    before: ${p.before}`)
  console.log(`    after:  ${p.after}`)
}

if (guardrailDrops.length > 0) {
  console.log(`\n=== Guardrail drops (${guardrailDrops.length} of ${skippedGuardrail}) ===`)
  for (const d of guardrailDrops) {
    console.log(`\n  ${d.slug}  tokens=${d.tokensBefore} → ${d.tokensAfter}`)
    console.log(`    before: ${d.before}`)
    console.log(`    after:  ${d.after}`)
  }
}

console.log(`\n${apply ? 'Updated' : 'Would update'} ${touched} rows.`)
if (!apply) console.log('Re-run with --apply to commit.')

await sql.end()
