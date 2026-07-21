// One-shot: targeted fixes for worst-match products carrying marketing prose
// instead of real INCI content.
//
// Covers cases that slipped through existing cleanup scripts:
//   1. LED device (Medicube): no INCI, only product description → NULL.
//   2. Marketing preamble with unlisted claims (Eucerin Aquaphor): strip
//      "SANS CONSERVATEUR, SANS COLORANT, NON COMÉDOGÈNE, CLINIQUEMENT PROUVÉ"
//      prefix; the INCI body starts at CERA MICROCRISTALLINA.
//   3–4. Korean-beauty usage-instruction prefix (Mixsoon × 2): "Ingrédients :"
//      marker exists but post-strip INCI has <5 commas, so prose.ts quality
//      gate excluded them. Strip prefix and keep the short collagen-film INCI.
//
// Mary&May (mary-may-blackberry) was dropped: it once carried pure marketing
// prose, but the row now holds a valid INCI. NULLing it would destroy data.
//
// Destructive fixes fail closed when the source no longer matches the known
// bad payload. Dry-run by default. Pass --apply to UPDATE transactionally.
import { SQL } from 'bun'

import { planWorstMatchFix, type WorstMatchFix } from './worst-match-prose-plan'

const apply = process.argv.includes('--apply')

const sql = new SQL(process.env.DATABASE_URL ?? 'postgres://app:devpassword@app_db:5432/appdb')

const FIXES: WorstMatchFix[] = [
  // LED device with no cosmetic INCI.
  {
    slug: 'medicube-age-r-booster-pro-mini',
    action: 'null',
    expected: /(?:Age-R Booster Pro Mini|appareil|électroporation|LED)/i,
  },

  // Marketing preamble uses "SANS CONSERVATEUR / SANS COLORANT" which are not
  // in separators.ts MARKETING_PREFIX_RX. Real INCI starts at CERA MICROCRISTALLINA.
  {
    slug: 'eucerin-aquaphor-baume-reparateur',
    action: 'set',
    expected:
      /^SANS CONSERVATEUR,\s*SANS COLORANT,\s*NON COM[ÉE]DOG[ÈE]NE,\s*CLINIQUEMENT PROUV[ÉE][\s\S]*CERA MICROCRISTALLINA/i,
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

  // Eve Lom: SharePoint span soup captured whole. The real formula sits after
  // the "Full Ingredient List:" label inside the markup; strip tags, cut there.
  {
    slug: 'eve-lom-time-retreat-smoothing-eye-complex',
    action: 'strip-html',
    marker: /Full Ingredient List:\s*/i,
  },
  {
    slug: 'eve-lom-time-retreat-smoothing-eye-complex-peptide-infusion',
    action: 'strip-html',
    marker: /Full Ingredient List:\s*/i,
  },
  // Same span soup but usage instructions only. There is no formula to extract.
  {
    slug: 'eve-lom-cleansing-oil',
    action: 'null',
    expected: /^(?![\s\S]*Full Ingredient List)[\s\S]*How to Use[\s\S]*Apply 1,\s*2 pumps/i,
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

let skipped = 0

const planned: Array<{
  row: { id: string; slug: string; inci: string | null }
  next: string | null
}> = []

for (const fix of FIXES) {
  const row = bySlug.get(fix.slug)
  if (!row) {
    console.log(`  MISSING  ${fix.slug}`)
    skipped++
    continue
  }

  const plan = planWorstMatchFix(fix, row.inci)
  if (plan.kind === 'reject') {
    throw new Error(`REFUSE ${fix.slug}: ${plan.reason}`)
  }
  if (plan.kind === 'noop') {
    console.log(`  SKIP (${plan.reason})  ${fix.slug}`)
    skipped++
    continue
  }

  const before = row.inci?.slice(0, 120) ?? 'NULL'
  const after = plan.next?.slice(0, 120) ?? 'NULL'
  console.log(`\n  ${fix.slug}`)
  console.log(`    before: ${before}`)
  console.log(`    after:  ${after}`)

  planned.push({ row, next: plan.next })
}

if (apply && planned.length > 0) {
  await sql.begin(async (tx) => {
    for (const { row, next } of planned) {
      const updated = await tx<Array<{ id: string }>>`
        UPDATE products
        SET inci = ${next}
        WHERE id = ${row.id}
          AND inci IS NOT DISTINCT FROM ${row.inci}
        RETURNING id
      `
      if (updated.length !== 1) {
        throw new Error(`REFUSE ${row.slug}: row changed after validation`)
      }
    }
  })
}

console.log(`\n${apply ? 'Applied' : 'Would apply'} ${planned.length} fix(es), skipped ${skipped}.`)
if (!apply) console.log('Re-run with --apply to commit.')

await sql.end()
