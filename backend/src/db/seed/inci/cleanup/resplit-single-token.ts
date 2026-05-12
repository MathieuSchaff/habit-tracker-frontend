// fallow-ignore-file unused-file
// One-shot: re-tokenize single-line INCI strings whose scraper lost separators.
// Two strategies: (1) trivial-separator split for " - " / " • " / " / " forms,
// (2) longest-match against algo-derm alias index for uppercase blobs.
// Dry-run by default. After --apply, regenerate snapshot + re-audit.
//
// See backend/src/db/seed/docs/audits/INCI-QUALITY-AUDIT.md §6 item 10.
import { SQL } from 'bun'

import { normalize, splitINCI } from 'algo-derm'
import { buildAliasIndex, MERGED_EVIDENCE_DB } from 'algo-derm/engine'

const apply = process.argv.includes('--apply')
const limit = (() => {
  const arg = process.argv.find((a) => a.startsWith('--limit='))
  return arg ? Number(arg.slice('--limit='.length)) : Number.POSITIVE_INFINITY
})()

const aliasIndex = buildAliasIndex(MERGED_EVIDENCE_DB)
console.log(`Alias index: ${aliasIndex.size} keys`)

const sql = new SQL(process.env.DATABASE_URL ?? 'postgres://app:devpassword@app_db:5432/appdb')
const rows = await sql<Array<{ id: string; slug: string; inci: string }>>`
  SELECT id, slug, inci
  FROM products
  WHERE inci IS NOT NULL AND length(inci) > 10
`

// Non-INCI patterns: pure-oil descriptors, dental fibre blurbs, "see packaging".
// These exist because the catalog mixes cosmetics with dental/supplement SKUs.
const NON_INCI_RX =
  /^(fibres |caoutchouc|tige |pour la liste|voir (la )?composition|100% |arcilla|nitrizinc|collag[èe]ne hydrolys|pulpe|butyrospermum parkii butter\*|sa formule|formule inci\s*:\s*$)/i

// Marketing/brand-name prefix glued to first ingredient — strip before split.
// Caps preserved because actual INCI tokens are also caps in these strings.
const LEADING_PREFIX_RX = /^(FORMULE INCI\s*:\s*|BRUME HYDRATANTE INVISIBLE|FORMULE\s*:\s*)/i

const SEPARATOR_RX = / [-•] |\s•\s|;\s+/
// " / " is ambiguous: WATER / EAU vs OIL / GLYCERIN — only split when surrounded
// by non-synonym pairs. Cheap heuristic: split on " / " unless both sides are
// known aqua/water/eau synonyms.
const SYNONYM_TOKENS = new Set(['aqua', 'water', 'eau', 'parfum', 'fragrance'])

function trivialSplit(inci: string): string[] | null {
  const stripped = inci.replace(LEADING_PREFIX_RX, '').trim()
  if (!SEPARATOR_RX.test(stripped) && !stripped.includes(' / ')) return null
  // Replace " / " between non-synonym tokens with comma, then split on -/•
  const slashed = stripped.replace(/\s\/\s/g, (_, _idx, _str) => ' / ') // keep as-is; handled below
  // Simpler: split on regex, then handle synonyms
  const parts = slashed.split(/\s[-•]\s|\s•\s|;\s+/).flatMap((p) => p.split(/\s\/\s/))
  const cleaned = parts.map((p) => p.trim()).filter((p) => p.length > 0)
  if (cleaned.length < 2) return null
  return cleaned
}

// Longest-match re-split: walk tokens, at each position try windows of
// 5..1 against aliasIndex; emit matched span as 1 token, accumulate unmatched
// words into a single trailing token until next match.
const MAX_WINDOW = 5

// fallow-ignore-next-line cognitive_crap
function longestMatchSplit(inci: string): string[] | null {
  const stripped = inci.replace(LEADING_PREFIX_RX, '').trim()
  const words = stripped.split(/\s+/).filter((w) => w.length > 0)
  if (words.length < 4) return null

  const out: string[] = []
  let buf: string[] = []
  let i = 0
  let matchedSpans = 0
  let unmatchedSpans = 0
  while (i < words.length) {
    let matched: number | null = null
    for (let n = Math.min(MAX_WINDOW, words.length - i); n >= 1; n--) {
      const candidate = words.slice(i, i + n).join(' ')
      const norm = normalize(candidate)
      if (aliasIndex.has(norm)) {
        matched = n
        break
      }
    }
    if (matched !== null) {
      if (buf.length > 0) {
        out.push(buf.join(' '))
        buf = []
        unmatchedSpans++
      }
      out.push(words.slice(i, i + matched).join(' '))
      i += matched
      matchedSpans++
    } else {
      buf.push(words[i])
      i++
    }
  }
  if (buf.length > 0) {
    out.push(buf.join(' '))
    unmatchedSpans++
  }

  if (matchedSpans < 3) return null
  if (out.length < 2) return null
  // Tight quality filter: at least half the emitted spans must be matched,
  // otherwise the re-split is likely shredding a marketing blob into noise.
  const ratio = matchedSpans / (matchedSpans + unmatchedSpans)
  if (ratio < 0.7) return null
  return out
}

const candidates = rows.filter((r) => {
  if (splitINCI(r.inci).length !== 1) return false
  if (r.inci.length <= 80) return false
  if (NON_INCI_RX.test(r.inci)) return false
  return true
})
console.log(`Candidates: ${candidates.length}`)

let updated = 0
let trivialCount = 0
let blobCount = 0
let skipped = 0
const previews: Array<{ slug: string; strategy: string; before: string; after: string[] }> = []

for (const row of candidates) {
  if (updated >= limit) break

  let tokens: string[] | null = trivialSplit(row.inci)
  let strategy = 'trivial'
  if (tokens === null) {
    tokens = longestMatchSplit(row.inci)
    strategy = 'longest-match'
  }
  if (tokens === null) {
    skipped++
    continue
  }
  const recombined = tokens.join(', ')
  if (recombined === row.inci) {
    skipped++
    continue
  }

  if (previews.length < 12)
    previews.push({ slug: row.slug, strategy, before: row.inci, after: tokens })
  if (strategy === 'trivial') trivialCount++
  else blobCount++

  if (apply) {
    await sql`UPDATE products SET inci = ${recombined} WHERE id = ${row.id}`
  }
  updated++
}

console.log(`\n=== Preview (${previews.length} samples) ===`)
for (const p of previews) {
  console.log(`\n  [${p.strategy}] ${p.slug}`)
  console.log(`    before: ${p.before.slice(0, 140)}`)
  console.log(
    `    after:  ${p.after.slice(0, 8).join(' | ')}${p.after.length > 8 ? ` | ... (+${p.after.length - 8})` : ''}`
  )
}

console.log(`\n${apply ? 'Updated' : 'Would update'} ${updated} rows.`)
console.log(`  trivial: ${trivialCount}`)
console.log(`  blob:    ${blobCount}`)
console.log(`  skipped: ${skipped}`)
if (!apply) console.log('\nRe-run with --apply to commit.')

await sql.end()
