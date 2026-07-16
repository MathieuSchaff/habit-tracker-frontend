// Dry-run audit for the pharmacological-cluster pass (audit O3).
//
// Read-only. Audit-auto-tags covers passe 1 (algo-derm tagProduct) only.
// This runner targets passe 2 (`detectActifClasses`): 12 distinct cluster slugs
// (RETINOIDS, VITAMIN_C, VITAMIN_E, AHA, BHA, PHA, CERAMIDES, HYALURONIC_ACID,
// PEPTIDES, POLYPHENOLS, TYROSINASE_INHIBITORS, ENZYMES_EXFOLIANTS).
// BHA has two ACTIF_CLASS_DEFS entries (different positionCap), same slug.
//
// Per cluster reports:
//   hit:   products that would receive the cluster slug
//   agree: hit ∩ already-present in tag_products
//   new:   hit \ already-present (proposed additions)
//   manual_only: cluster slugs in DB that the detector does NOT emit (audit
//                signal: either the rule misses an INCI variant, or the
//                manual tag was applied without the cluster firing, drift)
//   top kinds: top 3 ProductKinds where the cluster fires, with counts.
//              Catches gating drift (e.g. RETINOIDS firing on cleansers
//              should be rare → backfill bug or INCI parsing edge).
//
// No writes. The clusters are emitted by `detectAllAutoTags` at relevance
// 'secondary' source 'actif-class'; so this audit does NOT reflect the
// orchestrator's avoid precedence (relevant only for grossesse / cross-
// signal-avoid, not for clusters).
//
// Measures three things, kept distinct:
//   - couverture: how many products each cluster fires on (hit / new / agree / only_db).
//   - agreement: hit vs the DB tag set (a backfilled false positive reads as `agree`).
//   - justesse: hit vs the gold set (human truth) — the only signal that catches a
//     wrong tag the DB already agrees with. Plus cap-marginal acid hits (admitted
//     ONLY by the looser rinse-off cap = pH-adjuster suspects, audit obs 1).
// Evidence (matched token @ INCI position + the cap rule) is shown by default for
// the actionable findings, not hidden behind DUMP_* flags.
//
// Tunables via env:
//   LIMIT          optional: cap product count (debug)
//   GOLD_SET_PATH  optional: alternative annotations.json (else default path)

import type { ProductKind } from '@aurore/shared'

import { DEFAULT_GOLD_SET_PATH, loadGoldSet } from '../../gold-set/fixtures'
import type { TagEvidence } from '../../lib/pass-types'
import {
  ACTIF_CLASS_DEFS,
  detectActifClassesWithEvidence,
} from '../../passes/actif-class-detection'
import { exitOnError } from '../cli-args'
import { pad } from '../fmt'
import { fetchEligibleProducts, fetchProductTagSlugsByProduct } from './db'
import { LIMIT } from './env'

const DUMP_DRIFT = process.env.DUMP_DRIFT === '1'
const DUMP_NEW = process.env.DUMP_NEW === '1'
const GOLD_SET_PATH = process.env.GOLD_SET_PATH ?? DEFAULT_GOLD_SET_PATH

// Cap on per-cluster finding lists so a noisy cluster cannot flood the report;
// the dropped count is always printed (no silent truncation).
const SAMPLE = 20

interface Finding {
  slug: string
  kind: string
  token: string
  position: number
  rule: string
  inci: string | null
}

interface ClusterStat {
  hit: number
  agree: number
  new: number
  manualOnly: number
  goldTP: number
  goldFP: number
  byKind: Map<ProductKind, number>
  driftProducts: Array<{ slug: string; kind: string; inci: string | null }>
  newProducts: Array<{ slug: string; kind: string; inci: string | null }>
  // Acid hit that cleared the rinse-off cap but would fail the leave-on cap.
  capMarginal: Finding[]
  // Hit the gold set explicitly marks absent for this cluster (confirmed FP).
  goldFalsePos: Finding[]
}

// Leave-on positionCap of the def whose pattern matched `token` for `slug`.
// Used to decide whether a rinse-off hit is cap-marginal (would fail leave-on).
function leaveOnCap(slug: string, token: string): number | undefined {
  for (const def of ACTIF_CLASS_DEFS) {
    if (def.slug !== slug) continue
    const matched = def.exact
      ? def.patterns.includes(token)
      : def.patterns.some((p) => token.includes(p))
    if (matched) return def.positionCap
  }
  return undefined
}

// A hit is cap-marginal when it was admitted only because the rinse-off cap is
// looser than the leave-on cap (position would be excluded under leave-on).
function isCapMarginal(ev: TagEvidence, slug: string): boolean {
  if (!ev.rule?.startsWith('positionCapRinseOff') || ev.position === undefined) return false
  const loc = leaveOnCap(slug, ev.matchedToken ?? '')
  return loc !== undefined && Number.isFinite(loc) && ev.position >= loc
}

function printFindings(findings: Finding[]): void {
  for (const f of findings.slice(0, SAMPLE)) {
    console.log(`   [${f.kind}] ${f.slug}`)
    // position is 0-based internally; display 1-based to match how INCI reads.
    console.log(`      ${f.token} · pos ${f.position + 1} · ${f.rule}`)
    const snip = f.inci ? f.inci.slice(0, 160) : '(no inci)'
    console.log(`      ${snip}${(f.inci?.length ?? 0) > 160 ? '…' : ''}`)
  }
  if (findings.length > SAMPLE) console.log(`   … +${findings.length - SAMPLE} de plus`)
}

async function main() {
  const uniqueClusterSlugs = new Set(ACTIF_CLASS_DEFS.map((d) => d.slug))
  console.log(`🧪 Audit actif-class (passe 2)`)
  console.log(`   ${uniqueClusterSlugs.size} clusters${LIMIT ? ` · limit=${LIMIT}` : ''}\n`)

  const subset = await fetchEligibleProducts({
    categories: ['skincare'],
    limit: LIMIT ?? undefined,
  })

  const existingByProduct = await fetchProductTagSlugsByProduct([...uniqueClusterSlugs])

  // Gold set is optional: justesse columns degrade to omitted if it can't load.
  let goldBySlug: Map<string, { present: Set<string>; absent: Set<string> }> | null = null
  try {
    const gold = await loadGoldSet(GOLD_SET_PATH)
    goldBySlug = new Map()
    for (const a of gold.annotations) {
      goldBySlug.set(a.productSlug, { present: new Set(a.present), absent: new Set(a.absent) })
    }
    console.log(`   gold-set : ${goldBySlug.size} produits annotés\n`)
  } catch (e) {
    console.log(`   ⚠  gold-set indisponible (${e instanceof Error ? e.message : e})\n`)
  }

  const stats = new Map<string, ClusterStat>()
  for (const def of ACTIF_CLASS_DEFS) {
    stats.set(def.slug, {
      hit: 0,
      agree: 0,
      new: 0,
      manualOnly: 0,
      goldTP: 0,
      goldFP: 0,
      byKind: new Map(),
      driftProducts: [],
      newProducts: [],
      capMarginal: [],
      goldFalsePos: [],
    })
  }

  let withInci = 0
  let totalEmitted = 0

  for (const p of subset) {
    if (!p.inci?.trim()) continue
    withInci++

    const detected = detectActifClassesWithEvidence(
      p.inci,
      undefined,
      p.kind as ProductKind,
      p.name
    )
    const existing = existingByProduct.get(p.id) ?? new Set<string>()
    const gold = goldBySlug?.get(p.slug)
    const kindLabel = p.kind ?? 'unknown'

    for (const [slug, ev] of detected) {
      const stat = stats.get(slug)
      if (!stat) continue
      stat.hit++
      totalEmitted++
      if (existing.has(slug)) stat.agree++
      else {
        stat.new++
        if (DUMP_NEW) stat.newProducts.push({ slug: p.slug, kind: kindLabel, inci: p.inci })
      }
      const kind = p.kind as ProductKind
      stat.byKind.set(kind, (stat.byKind.get(kind) ?? 0) + 1)

      const finding: Finding = {
        slug: p.slug,
        kind: kindLabel,
        token: ev.matchedToken ?? '?',
        position: ev.position ?? -1,
        rule: ev.rule ?? '?',
        inci: p.inci,
      }
      if (isCapMarginal(ev, slug)) stat.capMarginal.push(finding)
      // Justesse: only gold-rated products count; absent = confirmed false positive.
      if (gold?.present.has(slug)) stat.goldTP++
      else if (gold?.absent.has(slug)) {
        stat.goldFP++
        stat.goldFalsePos.push(finding)
      }
    }

    // manual_only: detector miss on a manually-tagged cluster slug, signals rule drift.
    const detectedSlugs = new Set<string>(detected.keys())
    for (const slug of existing) {
      if (!detectedSlugs.has(slug)) {
        const stat = stats.get(slug)
        if (!stat) continue
        stat.manualOnly++
        if (DUMP_DRIFT) {
          stat.driftProducts.push({ slug: p.slug, kind: p.kind ?? 'unknown', inci: p.inci })
        }
      }
    }
  }

  console.log(`📊 Couverture`)
  console.log(`   ${subset.length} produits skincare`)
  console.log(`   ${withInci} avec INCI exploitable · ${totalEmitted} paires émises\n`)

  console.log(`📋 Par cluster (trié par hit DESC)`)

  const sorted = [...stats.entries()].sort((a, b) => b[1].hit - a[1].hit)
  const coverageRows = sorted.map(([slug, stat]) => {
    const agreePct = stat.hit === 0 ? '—' : `${((stat.agree / stat.hit) * 100).toFixed(0)} %`
    return {
      cluster: slug,
      hit: stat.hit,
      agree: stat.agree,
      new: stat.new,
      only_db: stat.manualOnly,
      'agree%': agreePct,
    }
  })
  console.table(coverageRows)

  console.log(`\n📋 Top 3 kinds par cluster`)
  for (const [slug, stat] of sorted) {
    if (stat.hit === 0) continue
    const topKinds = [...stat.byKind.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
    const summary = topKinds.map(([k, n]) => `${k}=${n}`).join(', ')
    console.log(`   ${pad(slug, 24)} ${summary}`)
  }

  const silent = sorted.filter(([_, stat]) => stat.hit === 0).map(([slug]) => slug)
  if (silent.length > 0) {
    console.log(`\n⚪ Clusters 0 hit : ${silent.join(', ')}`)
  }

  const drift = sorted.filter(([_, stat]) => stat.manualOnly > 0)
  if (drift.length > 0) {
    console.log(`\n🔍 Drift (manual sans détection — patterns à investiguer)`)
    for (const [slug, stat] of drift) {
      console.log(
        `   ${pad(slug, 24)} only_db=${stat.manualOnly}${stat.hit > 0 ? ` (vs hit=${stat.hit})` : ' (no detector hit)'}`
      )
    }
  }

  if (goldBySlug) {
    const justesse = sorted.filter(([_, s]) => s.goldTP + s.goldFP > 0)
    console.log(`\n🎯 Justesse vs gold-set (hits annotés — attrape les FP que la DB valide)`)
    if (justesse.length === 0) {
      console.log(`   (aucun hit sur un produit annoté)`)
    } else {
      const justesseRows = justesse.map(([slug, s]) => {
        const rated = s.goldTP + s.goldFP
        const prec = rated === 0 ? '—' : (s.goldTP / rated).toFixed(2)
        return { cluster: slug, TP: s.goldTP, FP: s.goldFP, P: prec }
      })
      console.table(justesseRows)
    }
  }

  const marginal = sorted.filter(([_, s]) => s.capMarginal.length > 0)
  if (marginal.length > 0) {
    const total = marginal.reduce((n, [_, s]) => n + s.capMarginal.length, 0)
    console.log(
      `\n⚠️  Acid hits cap-marginaux (${total}) — admis seulement par le cap rinse-off plus large = suspects pH-adjuster (obs 1)`
    )
    for (const [slug, s] of marginal) {
      console.log(`\n── ${slug} (${s.capMarginal.length}) ──`)
      printFindings(s.capMarginal)
    }
  }

  if (goldBySlug) {
    const fp = sorted.filter(([_, s]) => s.goldFalsePos.length > 0)
    if (fp.length > 0) {
      const total = fp.reduce((n, [_, s]) => n + s.goldFalsePos.length, 0)
      console.log(`\n❌ Faux positifs confirmés par le gold-set (${total})`)
      for (const [slug, s] of fp) {
        console.log(`\n── ${slug} (${s.goldFalsePos.length}) ──`)
        printFindings(s.goldFalsePos)
      }
    }
  }

  if (DUMP_DRIFT) {
    console.log(`\n📦 Dump drift products (DUMP_DRIFT=1)`)
    for (const [slug, stat] of sorted) {
      if (stat.driftProducts.length === 0) continue
      console.log(`\n── ${slug} (${stat.driftProducts.length}) ──`)
      for (const p of stat.driftProducts) {
        const inciTrunc = p.inci ? p.inci.slice(0, 200) : '(no inci)'
        console.log(`  [${p.kind}] ${p.slug}`)
        console.log(`     ${inciTrunc}${(p.inci?.length ?? 0) > 200 ? '…' : ''}`)
      }
    }
  }

  if (DUMP_NEW) {
    console.log(`\n🆕 Dump new proposals (DUMP_NEW=1)`)
    for (const [slug, stat] of sorted) {
      if (stat.newProducts.length === 0) continue
      console.log(`\n── ${slug} (${stat.newProducts.length}) ──`)
      for (const p of stat.newProducts) {
        const inciTrunc = p.inci ? p.inci.slice(0, 200) : '(no inci)'
        console.log(`  [${p.kind}] ${p.slug}`)
        console.log(`     ${inciTrunc}${(p.inci?.length ?? 0) > 200 ? '…' : ''}`)
      }
    }
  }

  console.log(`\n✨ Audit terminé. Aucun INSERT effectué.\n`)
}

if (import.meta.main) {
  main().catch(exitOnError)
}
