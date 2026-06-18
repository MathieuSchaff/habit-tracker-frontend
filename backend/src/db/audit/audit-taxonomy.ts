// Taxonomy-coherence audit (read-only, no orchestrator, pure DB shape).
//
// Catches structural taxonomy noise the pipeline audits can't see because they
// measure detector-vs-DB agreement, not whether a tag is meaningful:
//   1. absence claims ("sans-X") applied to product kinds where X never occurs
//      in the whole catalogue → the tag asserts the absence of something that
//      was never plausible = zero information.
//   2. product_type_v2 carrying an action ("exfoliation") that co-occurs with a
//      real format → the format axis is not mutually exclusive (axis leak).
//   3. concern vs skin_effect tags sharing a root (reparation/reparateur,
//      rougeurs/apaisant) → the two axes duplicate; surfaced to inform a human
//      taxonomy decision, not to fail the run.
//
// All findings are 'info': taxonomy shape ≠ data corruption.

import { sql } from 'drizzle-orm'

import { db } from '..'

type Finding = { description: string }
type CheckResult = { name: string; severity: 'info'; findings: Finding[] }

// Absence-claim characteristics + the INCI signal whose absence they assert.
// Regex mirrors algo-derm's sulfate_surfactant group (lauryl/laureth/myreth/
// coco/cetearyl/coceth × sulfate) so "plausible" matches what the tag claims.
const ABSENCE_CLAIMS: ReadonlyArray<{ slug: string; presenceRe: string }> = [
  {
    slug: 'sans-sulfates',
    presenceRe: '(lauryl|laureth|myreth|coco-?|cetearyl|coceth)\\s*sulfate',
  },
]

// concern ⇄ skin_effect pairs that share a semantic root.
const CONCERN_EFFECT_PAIRS: ReadonlyArray<{ concern: string; effect: string }> = [
  { concern: 'reparation-cutanee', effect: 'reparateur' },
  { concern: 'rougeurs-vasculaires', effect: 'apaisant' },
]

// 1. "sans-X" on kinds where X never appears in the catalogue → non-informative.
async function checkAbsenceClaimImplausibleKind(): Promise<CheckResult> {
  const findings: Finding[] = []
  for (const claim of ABSENCE_CLAIMS) {
    const rows = await db.execute(sql`
      WITH tagged AS (
        SELECT p.kind, count(*) AS n_tag
        FROM product_tag_links ptl
        JOIN product_tag_types t ON t.id = ptl.product_tag_id AND t.slug = ${claim.slug}
        JOIN products p ON p.id = ptl.product_id
          AND p.moderation_status = 'visible' AND p.category = 'skincare'
        GROUP BY p.kind
      ),
      present AS (
        SELECT p.kind, count(*) AS n_present
        FROM products p
        WHERE p.moderation_status = 'visible' AND p.category = 'skincare'
          AND p.inci ~* ${claim.presenceRe}
        GROUP BY p.kind
      )
      SELECT tagged.kind, tagged.n_tag
      FROM tagged LEFT JOIN present ON present.kind = tagged.kind
      WHERE COALESCE(present.n_present, 0) = 0
      ORDER BY tagged.n_tag DESC
    `)
    const noise = rows.reduce((acc, r) => acc + Number(r.n_tag), 0)
    if (noise > 0) {
      findings.push({
        description: `${claim.slug}: ${noise} tags sur des kinds à 0 occurrence catalogue (non informatif) — ${rows
          .map((r) => `${r.kind ?? 'null'}=${r.n_tag}`)
          .join(', ')}`,
      })
    }
  }
  return { name: 'absence-claim-implausible-kind', severity: 'info', findings }
}

// 2. type-exfoliation (an action) co-occurring with a real product_type_v2 format.
async function checkProductTypeAxisLeak(): Promise<CheckResult> {
  const rows = await db.execute(sql`
    WITH exf AS (
      SELECT ptl.product_id
      FROM product_tag_links ptl
      JOIN product_tag_types t ON t.id = ptl.product_tag_id AND t.slug = 'type-exfoliation'
      JOIN products p ON p.id = ptl.product_id
        AND p.moderation_status = 'visible' AND p.category = 'skincare'
    )
    SELECT t2.slug AS other, count(*) AS n
    FROM exf
    JOIN product_tag_links ptl2 ON ptl2.product_id = exf.product_id
    JOIN product_tag_types t2 ON t2.id = ptl2.product_tag_id
      AND t2.type = 'product_type_v2' AND t2.slug <> 'type-exfoliation'
    GROUP BY t2.slug ORDER BY n DESC
  `)
  const total = rows.reduce((acc, r) => acc + Number(r.n), 0)
  const findings: Finding[] =
    total === 0
      ? []
      : [
          {
            description: `type-exfoliation co-occurre avec un vrai format sur ${total} produits (axe format non exclusif → exfoliation = action) — ${rows
              .map((r) => `${r.other}=${r.n}`)
              .join(', ')}`,
          },
        ]
  return { name: 'product-type-axis-leak', severity: 'info', findings }
}

// 3. concern ⇄ skin_effect same-root duplication (co-occurrence + Jaccard).
async function checkConcernEffectDuplication(): Promise<CheckResult> {
  const findings: Finding[] = []
  for (const pair of CONCERN_EFFECT_PAIRS) {
    const [row] = await db.execute(sql`
      WITH c AS (
        SELECT ptl.product_id FROM product_tag_links ptl
        JOIN product_tag_types t ON t.id = ptl.product_tag_id AND t.slug = ${pair.concern}
      ),
      e AS (
        SELECT ptl.product_id FROM product_tag_links ptl
        JOIN product_tag_types t ON t.id = ptl.product_tag_id AND t.slug = ${pair.effect}
      )
      SELECT
        (SELECT count(*) FROM c) AS n_concern,
        (SELECT count(*) FROM e) AS n_effect,
        (SELECT count(*) FROM c JOIN e USING (product_id)) AS n_both
    `)
    if (!row) continue
    const nConcern = Number(row.n_concern)
    const nEffect = Number(row.n_effect)
    const nBoth = Number(row.n_both)
    const union = nConcern + nEffect - nBoth
    const jaccard = union === 0 ? 0 : Math.round((nBoth / union) * 100)
    findings.push({
      description: `${pair.concern} (concern, ${nConcern}) ⇄ ${pair.effect} (effect, ${nEffect}) : co-occur ${nBoth}, Jaccard ${jaccard}%`,
    })
  }
  return { name: 'concern-effect-duplication', severity: 'info', findings }
}

const checkers = [
  checkAbsenceClaimImplausibleKind,
  checkProductTypeAxisLeak,
  checkConcernEffectDuplication,
]

async function main() {
  const results = await Promise.all(checkers.map((c) => c()))
  for (const r of results) {
    if (r.findings.length === 0) {
      console.log(`✓ ${r.name}`)
      continue
    }
    console.log(`ℹ ${r.name} (${r.findings.length})`)
    for (const f of r.findings) console.log(`  - ${f.description}`)
  }
  console.log(`\n✓ ${checkers.length} taxonomy checker(s) ran (info-only, never fails)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
