// fallow-ignore-file unused-file
// One-shot: targeted fixes for worst-match products carrying marketing prose
// instead of real INCI content.
//
// Covers five cases that slipped through existing cleanup scripts:
//   1. LED device (Medicube) — no INCI, only product description → NULL.
//   2. Pure marketing prose (Mary&May) — no recoverable INCI → NULL.
//   3. Marketing preamble with unlisted claims (Eucerin Aquaphor) — strip
//      "SANS CONSERVATEUR, SANS COLORANT, NON COMÉDOGÈNE, CLINIQUEMENT PROUVÉ"
//      prefix; the INCI body starts at CERA MICROCRISTALLINA.
//   4–5. Korean-beauty usage-instruction prefix (Mixsoon × 2) — "Ingrédients :"
//      marker exists but post-strip INCI has <5 commas, so prose.ts quality
//      gate excluded them. Strip prefix and keep the short collagen-film INCI.
//
// Dry-run by default. Pass --apply to UPDATE.
//
// See backend/src/db/seed/docs/ROADMAP.md §2 (worst-match products) and
// backend/src/db/seed/docs/audits/INCI-QUALITY-AUDIT.md §2.
import { SQL } from 'bun'

const apply = process.argv.includes('--apply')

const sql = new SQL(process.env.DATABASE_URL ?? 'postgres://app:devpassword@app_db:5432/appdb')

type Fix =
  | { slug: string; action: 'null' }
  | { slug: string; action: 'set'; value: string }
  | { slug: string; action: 'strip-after'; marker: RegExp }

const FIXES: Fix[] = [
  // LED device — no cosmetic INCI exists.
  { slug: 'medicube-age-r-booster-pro-mini', action: 'null' },

  // Pure marketing text; no "Ingrédients :" marker, no recoverable INCI.
  { slug: 'mary-may-blackberry-complex-glow-wash-off-pack', action: 'null' },

  // Marketing preamble uses "SANS CONSERVATEUR / SANS COLORANT" which are not
  // in separators.ts MARKETING_PREFIX_RX. Real INCI starts at CERA MICROCRISTALLINA.
  {
    slug: 'eucerin-aquaphor-baume-reparateur',
    action: 'set',
    value: 'CERA MICROCRISTALLINA, CERESIN, LANOLIN ALCOHOL, PANTHENOL, GLYCERIN, BISABOLOL',
  },

  // prose.ts skipped these because post-strip INCI has only 3 commas (4 ingredients),
  // below the MIN_COMMAS=5 quality gate. Extracting manually is safe here.
  {
    slug: 'mixsoon-melting-collagen-cheek-film',
    action: 'strip-after',
    marker: /Ingr[ée]dients?\s*:\s*/i,
  },
  {
    slug: 'mixsoon-melting-collagen-eye-film',
    action: 'strip-after',
    marker: /Ingr[ée]dients?\s*:\s*/i,
  },
]

const slugs = FIXES.map((f) => f.slug)

const rows: Array<{ id: string; slug: string; inci: string | null }> = []
for (const slug of slugs) {
  const r = await sql<Array<{ id: string; slug: string; inci: string | null }>>`
    SELECT id, slug, inci FROM products WHERE slug = ${slug}
  `
  rows.push(...r)
}

const bySlug = new Map(rows.map((r) => [r.slug, r]))

let applied = 0
let skipped = 0

for (const fix of FIXES) {
  const row = bySlug.get(fix.slug)
  if (!row) {
    console.log(`  MISSING  ${fix.slug}`)
    skipped++
    continue
  }

  let next: string | null

  if (fix.action === 'null') {
    next = null
  } else if (fix.action === 'set') {
    next = fix.value
  } else {
    // strip-after: find last marker, keep everything after it
    if (row.inci === null) {
      console.log(`  SKIP (already null)  ${fix.slug}`)
      skipped++
      continue
    }
    const m = [...row.inci.matchAll(new RegExp(fix.marker.source, fix.marker.flags + 'g'))]
    if (m.length === 0) {
      console.log(`  SKIP (no marker)  ${fix.slug}`)
      skipped++
      continue
    }
    const last = m[m.length - 1]
    next = row.inci.slice(last.index! + last[0].length).trimStart()
  }

  const before = row.inci?.slice(0, 120) ?? 'NULL'
  const after = next?.slice(0, 120) ?? 'NULL'
  console.log(`\n  ${fix.slug}`)
  console.log(`    before: ${before}`)
  console.log(`    after:  ${after}`)

  if (apply) {
    if (next === null) {
      await sql`UPDATE products SET inci = NULL WHERE id = ${row.id}`
    } else {
      await sql`UPDATE products SET inci = ${next} WHERE id = ${row.id}`
    }
  }
  applied++
}

console.log(`\n${apply ? 'Applied' : 'Would apply'} ${applied} fix(es), skipped ${skipped}.`)
if (!apply) console.log('Re-run with --apply to commit.')

await sql.end()
