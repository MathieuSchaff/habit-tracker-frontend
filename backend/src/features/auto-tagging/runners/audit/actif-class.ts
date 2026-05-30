// Dry-run audit for the pharmacological-cluster pass (audit O3).
//
// Read-only. Audit-auto-tags covers passe 1 (algo-derm tagProduct) only.
// This runner targets passe 2 (`detectActifClasses`) — the 12 cluster slugs
// (RETINOIDS, VITAMIN_C, AHA, BHA, PHA, CERAMIDES, HYALURONIC_ACID, PEPTIDES,
// POLYPHENOLS, TYROSINASE_INHIBITORS, ENZYMES, VITAMIN_E).
//
// Per cluster reports:
//   hit:   products that would receive the cluster slug
//   agree: hit ∩ already-present in tag_products
//   new:   hit \ already-present (proposed additions)
//   manual_only: cluster slugs in DB that the detector does NOT emit (audit
//                signal: either the rule misses an INCI variant, or the
//                manual tag was applied without the cluster firing — drift)
//   top kinds: top 3 ProductKinds where the cluster fires, with counts.
//              Catches gating drift (e.g. RETINOIDS firing on cleansers
//              should be rare → backfill bug or INCI parsing edge).
//
// No writes. The clusters are emitted by `detectAllAutoTags` at relevance
// 'secondary' source 'actif-class' — so this audit does NOT reflect the
// orchestrator's avoid precedence (relevant only for grossesse / cross-
// signal-avoid, not for clusters).
//
// Tunables via env:
//   LIMIT       optional       — cap product count (debug)

import type { ProductKind } from '@aurore/shared'

import { eq, sql } from 'drizzle-orm'

import { db } from '../../../../db'
import { products, productTagLinks, productTagTypes } from '../../../../db/schema'
import { ACTIF_CLASS_DEFS, detectActifClasses } from '../../passes/actif-class-detection'

const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : null
const DUMP_DRIFT = process.env.DUMP_DRIFT === '1'

interface ClusterStat {
  hit: number
  agree: number
  new: number
  manualOnly: number
  byKind: Map<ProductKind, number>
  driftProducts: Array<{ slug: string; kind: string; inci: string | null }>
}

async function main() {
  console.log(`🧪 Audit actif-class (passe 2)`)
  console.log(`   ${ACTIF_CLASS_DEFS.length} clusters${LIMIT ? ` · limit=${LIMIT}` : ''}\n`)

  await db.execute(sql`SET LOCAL app.role = 'admin'`)

  const skincare = await db
    .select({
      id: products.id,
      slug: products.slug,
      kind: products.kind,
      inci: products.inci,
    })
    .from(products)
    .where(eq(products.category, 'skincare'))

  const subset = LIMIT ? skincare.slice(0, LIMIT) : skincare

  // Existing (productId, slug) pairs scoped to the cluster slugs only.
  const clusterSlugs = new Set<string>(ACTIF_CLASS_DEFS.map((d) => d.slug))
  const existingRows = await db
    .select({ pId: productTagLinks.productId, slug: productTagTypes.slug })
    .from(productTagLinks)
    .innerJoin(productTagTypes, eq(productTagLinks.productTagId, productTagTypes.id))
  const existingByProduct = new Map<string, Set<string>>()
  for (const r of existingRows) {
    if (!clusterSlugs.has(r.slug)) continue
    let set = existingByProduct.get(r.pId)
    if (!set) {
      set = new Set()
      existingByProduct.set(r.pId, set)
    }
    set.add(r.slug)
  }

  const stats = new Map<string, ClusterStat>()
  for (const def of ACTIF_CLASS_DEFS) {
    stats.set(def.slug, {
      hit: 0,
      agree: 0,
      new: 0,
      manualOnly: 0,
      byKind: new Map(),
      driftProducts: [],
    })
  }

  let withInci = 0
  let totalEmitted = 0

  for (const p of subset) {
    if (!p.inci?.trim()) continue
    withInci++

    const detected = new Set<string>(detectActifClasses(p.inci, undefined, p.kind as ProductKind))
    const existing = existingByProduct.get(p.id) ?? new Set<string>()

    for (const slug of detected) {
      const stat = stats.get(slug)
      if (!stat) continue
      stat.hit++
      totalEmitted++
      if (existing.has(slug)) stat.agree++
      else stat.new++
      const kind = p.kind as ProductKind
      stat.byKind.set(kind, (stat.byKind.get(kind) ?? 0) + 1)
    }

    // Manual-only: cluster slug present in DB but the detector did not fire.
    // Surfaces drift between manual annotation and current rule set.
    for (const slug of existing) {
      if (!detected.has(slug)) {
        const stat = stats.get(slug)
        if (!stat) continue
        stat.manualOnly++
        if (DUMP_DRIFT) {
          stat.driftProducts.push({ slug: p.slug, kind: p.kind ?? 'unknown', inci: p.inci })
        }
      }
    }
  }

  // Reporting
  console.log(`📊 Couverture`)
  console.log(`   ${subset.length} produits skincare`)
  console.log(`   ${withInci} avec INCI exploitable · ${totalEmitted} paires émises\n`)

  console.log(`📋 Par cluster (trié par hit DESC)`)
  console.log(
    `   ${pad('cluster', 24)} ${rpad('hit', 6)} ${rpad('agree', 6)} ${rpad('new', 6)} ${rpad('only_db', 8)} ${rpad('agree%', 7)}`
  )
  console.log(
    `   ${'─'.repeat(24)} ${'─'.repeat(6)} ${'─'.repeat(6)} ${'─'.repeat(6)} ${'─'.repeat(8)} ${'─'.repeat(7)}`
  )

  const sorted = [...stats.entries()].sort((a, b) => b[1].hit - a[1].hit)
  for (const [slug, s] of sorted) {
    const agreePct = s.hit === 0 ? '—' : `${((s.agree / s.hit) * 100).toFixed(0)} %`
    console.log(
      `   ${pad(slug, 24)} ${rpad(String(s.hit), 6)} ${rpad(String(s.agree), 6)} ${rpad(String(s.new), 6)} ${rpad(String(s.manualOnly), 8)} ${rpad(agreePct, 7)}`
    )
  }

  // By-kind breakdown — surfaces gating drift. Skip clusters with 0 hits.
  console.log(`\n📋 Top 3 kinds par cluster`)
  for (const [slug, s] of sorted) {
    if (s.hit === 0) continue
    const topKinds = [...s.byKind.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
    const summary = topKinds.map(([k, n]) => `${k}=${n}`).join(', ')
    console.log(`   ${pad(slug, 24)} ${summary}`)
  }

  // Silence check — clusters allowed but never emitted.
  const silent = sorted.filter(([_, s]) => s.hit === 0).map(([slug]) => slug)
  if (silent.length > 0) {
    console.log(`\n⚪ Clusters 0 hit : ${silent.join(', ')}`)
  }

  // Drift summary — where manual_only is high, the detector misses cases.
  const drift = sorted.filter(([_, s]) => s.manualOnly > 0)
  if (drift.length > 0) {
    console.log(`\n🔍 Drift (manual sans détection — patterns à investiguer)`)
    for (const [slug, s] of drift) {
      console.log(
        `   ${pad(slug, 24)} only_db=${s.manualOnly}${s.hit > 0 ? ` (vs hit=${s.hit})` : ' (no detector hit)'}`
      )
    }
  }

  if (DUMP_DRIFT) {
    console.log(`\n📦 Dump drift products (DUMP_DRIFT=1)`)
    for (const [slug, s] of sorted) {
      if (s.driftProducts.length === 0) continue
      console.log(`\n── ${slug} (${s.driftProducts.length}) ──`)
      for (const p of s.driftProducts) {
        const inciTrunc = p.inci ? p.inci.slice(0, 200) : '(no inci)'
        console.log(`  [${p.kind}] ${p.slug}`)
        console.log(`     ${inciTrunc}${(p.inci?.length ?? 0) > 200 ? '…' : ''}`)
      }
    }
  }

  console.log(`\n✨ Audit terminé. Aucun INSERT effectué.\n`)
}

function pad(s: string, w: number): string {
  return s.length >= w ? s : s + ' '.repeat(w - s.length)
}

function rpad(s: string, w: number): string {
  return s.length >= w ? s : ' '.repeat(w - s.length) + s
}

if (import.meta.main || process.argv[1]?.endsWith('audit-actif-class.ts')) {
  main().catch((err) => {
    console.error('\n💥 Erreur :', err instanceof Error ? err.message : err)
    if (err instanceof Error && err.stack) console.error(err.stack)
    process.exit(1)
  })
}
