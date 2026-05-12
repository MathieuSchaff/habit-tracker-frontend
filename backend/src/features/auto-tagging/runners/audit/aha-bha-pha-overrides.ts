// Audit manual AHA / BHA / PHA tags that the detector does NOT emit.
//
// Read-only. The three acid clusters carry a positionCap of 10 by design
// (acide pH-dépendant past pos 10 = pH adjuster / preservative trace, not
// a functional exfoliant — see AUTO-TAGS.md §"AHA / BHA / PHA — drift
// conservée par design"). Manual annotations are concentration-agnostic
// and tag any product that contains the molecule, so 254 manual pairs
// survive past the cap. Decision is offline, case-by-case (some are
// marketing-legitimate like dermalogica-daily-microfoliant BHA @23 even
// though the cap excludes them; others are clearly inert pH adjusters).
//
// Output:
//   - Console: per-tag counts, top kinds, top ingredients, position
//     buckets (10–14 / 15–19 / 20+) so the borderline calls jump out.
//   - CSV (optional, CSV_OUT=...): one row per (product, tag) override
//     with product_slug, tag_slug, ingredient, position, kind, name,
//     inci_excerpt (~6 tokens around the match).
//
// Tunables via env:
//   CSV_OUT     optional       — path to write the override CSV (single file)
//   CSV_DIR     optional       — write 3 split CSVs in this dir:
//                                  delete.csv     · auto-classified safe-delete
//                                  keep.csv       · auto-classified marketed
//                                  borderline.csv · needs case-by-case review
//   LIMIT       optional       — cap product count (debug)
//   APPLY       optional 1     — destructive: DELETE pairs listed in
//                                APPLY_FROM_CSV. Skips the audit pass entirely.
//   APPLY_FROM_CSV  required   — path to a CSV with header
//                                product_slug,tag_slug,…  (any extra cols
//                                ignored). Pairs are deleted via composite
//                                lookup (productId, productTagId).

import type { ProductKind } from '@habit-tracker/shared'

import { normalize, splitINCI } from 'algo-derm'
import { eq, inArray, sql } from 'drizzle-orm'

import { db } from '../../../../db'
import { products, productTagsDefs, tagProducts } from '../../../../db/schema'
import { AUTO_TAG_ELIGIBLE_CATEGORIES } from '../../orchestrator'
import { detectActifClasses } from '../../passes/actif-class-detection'

const TARGET_SLUGS = ['aha', 'bha', 'pha'] as const
type TargetSlug = (typeof TARGET_SLUGS)[number]

// Mirrors `actif-class-detection.ts` cluster patterns for the 3 acid slugs.
// Keep in sync if the detector evolves — the audit is meaningless if the
// pattern set drifts.
const PATTERNS: Record<TargetSlug, readonly string[]> = {
  aha: [
    'glycolic acid',
    'lactic acid',
    'mandelic acid',
    'malic acid',
    'tartaric acid',
    'ammonium lactate',
  ],
  bha: ['salicylic acid', 'capryloyl salicylic acid', 'betaine salicylate'],
  pha: ['gluconolactone', 'lactobionic acid', 'galactose'],
}

const CSV_OUT = process.env.CSV_OUT
const CSV_DIR = process.env.CSV_DIR
const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : null
const APPLY = process.env.APPLY === '1'
const APPLY_FROM_CSV = process.env.APPLY_FROM_CSV

interface OverrideRow {
  productSlug: string
  tagSlug: TargetSlug
  ingredient: string
  position: number
  kind: ProductKind
  name: string
  inciExcerpt: string
}

type Verdict = 'delete' | 'keep' | 'borderline'

// Heuristic auto-classification.
//
// Rationale (matches the AUTO-TAGS.md "drift conservée par design" doc):
//   - The detector cap=10 is the chemistry-aware policy. Past pos 10 the
//     molecule is mostly inert (pH adjuster / preservative trace). Manual
//     baselines are concentration-agnostic — they tag any product that
//     contains the molecule, including those where it has no exfoliant
//     intent.
//   - Marketing intent overrides chemistry when the product is sold as
//     an exfoliant. Dermalogica Daily Microfoliant (BHA at pos 23) is
//     functionally a BHA peel even though the cap excludes it.
//   - Anti-acne / anti-pigmentation formulas commonly use AHA/BHA at
//     mid-position as a functional adjunct (concentration ~0.5-1 %, pos
//     11-19). Keep when the product's primary positioning is acne or
//     pigmentation, even if the name doesn't carry the acid marker.
//
// Rules in precedence order:
//   1. Marketed exfoliant (name carries an acid/peel marker) → keep.
//   2. Hair / scalp products → delete (irrelevant to face exfoliant tags).
//   3. Anti-acne / anti-pigmentation product + pos ≤ 19 → keep (adjunct).
//   4. Position 20+ → delete (canonical inert past mid-tail).
//   5. Position 15-19 in non-acne / non-pigmentation product → delete.
//   6. Position 11-14 → borderline (truly ambiguous — case-by-case).
const MARKET_MARKERS = [
  'aha',
  'bha',
  'pha',
  'salicylic',
  'salicyclique',
  'glycolic',
  'glycolique',
  'mandelic',
  'lactobionic',
  'peel',
  'peeling',
  'foliant', // microfoliant / superfoliant / exfoliant
  'exfolian',
  'exfoliating',
  'exfoliant',
]

const HAIR_MARKERS = [
  'shampoo',
  'shampoing',
  'shampooing',
  'dercos',
  'antipelliculaire',
  'anti-pelliculaire',
  'anti pelliculaire',
  'anti-chute',
  'antichute',
  'cuir chevelu',
  'kerium',
  'ilcapil',
]

// Acne / pigmentation product positioning — when the product is sold as
// an acne or anti-pigmentation treatment, AHA/BHA at mid-position is the
// canonical functional adjunct (not pH adjuster). Keep these regardless
// of the molecule's exact INCI position up to 19.
const ACNE_MARKERS = [
  'sebium',
  'sebiaclear',
  'sebio', // sebionex, sebium etc
  'acniben',
  'keracnyl',
  'normaderm',
  'effaclar',
  'blemish',
  'acne ', // trailing space avoids matching "menacne" or substrings; "acne-" / "acne " covered
  'acne-',
  'anti-imperfection',
  'antiimperfection',
  'imperfection',
  'spot ',
  'spot-treatment',
  'pore ',
  'pore-',
  'oily skin',
  'peau grasse',
  'peaux grasses',
  'redness reform',
  'breakout',
]

const PIGMENTATION_MARKERS = [
  'anti-taches',
  'anti taches',
  'antitaches',
  'anti-tache',
  'dark spot',
  'mela b3',
  'mela ',
  'melaclear',
  'depiwhite',
  'depigment',
  'brightening',
  'eclaircissant',
  'illuminating',
  'pigmentaires',
  'pigmenta',
  'glutathiosome',
  'neotone',
  'meno 5',
]

function classify(row: OverrideRow): Verdict {
  const name = row.name.toLowerCase()
  const slug = row.productSlug.toLowerCase()
  const haystack = `${name} ${slug}`

  if (MARKET_MARKERS.some((m) => haystack.includes(m))) return 'keep'
  if (HAIR_MARKERS.some((m) => haystack.includes(m))) return 'delete'
  const isAcne = ACNE_MARKERS.some((m) => haystack.includes(m))
  const isPigmentation = PIGMENTATION_MARKERS.some((m) => haystack.includes(m))
  if ((isAcne || isPigmentation) && row.position <= 19) return 'keep'
  if (row.position >= 20) return 'delete'
  if (row.position >= 15) return 'delete'
  return 'borderline'
}

async function main() {
  if (APPLY) {
    await applyDeletions()
    return
  }

  console.log(`🔍 Audit overrides AHA / BHA / PHA (manual past cap=10)`)
  console.log(`   targets=${TARGET_SLUGS.join(',')}${LIMIT ? ` · limit=${LIMIT}` : ''}\n`)

  await db.execute(sql`SET LOCAL app.role = 'admin'`)

  const allProducts = await db
    .select({
      id: products.id,
      slug: products.slug,
      kind: products.kind,
      name: products.name,
      inci: products.inci,
    })
    .from(products)
    .where(inArray(products.category, [...AUTO_TAG_ELIGIBLE_CATEGORIES]))

  const subset = LIMIT ? allProducts.slice(0, LIMIT) : allProducts

  const existingRows = await db
    .select({ pId: tagProducts.productId, slug: productTagsDefs.slug })
    .from(tagProducts)
    .innerJoin(productTagsDefs, eq(tagProducts.productTagId, productTagsDefs.id))
    .where(inArray(productTagsDefs.slug, [...TARGET_SLUGS]))

  const manualByProduct = new Map<string, Set<TargetSlug>>()
  for (const r of existingRows) {
    let set = manualByProduct.get(r.pId)
    if (!set) {
      set = new Set()
      manualByProduct.set(r.pId, set)
    }
    set.add(r.slug as TargetSlug)
  }

  const overrides: OverrideRow[] = []
  let scanned = 0
  let withManual = 0
  let detectorAgrees = 0

  for (const p of subset) {
    const manual = manualByProduct.get(p.id)
    if (!manual || manual.size === 0) continue
    withManual++
    if (!p.inci?.trim()) continue
    scanned++

    const detected = new Set<string>(detectActifClasses(p.inci))
    const tokens = splitINCI(p.inci).map(normalize).filter(Boolean)

    for (const slug of manual) {
      if (detected.has(slug)) {
        detectorAgrees++
        continue
      }
      // Detector disagrees — find the matching pattern + earliest position.
      let bestIdx = -1
      let bestPattern = ''
      for (let i = 0; i < tokens.length; i++) {
        for (const pat of PATTERNS[slug]) {
          if (tokens[i].includes(pat)) {
            if (bestIdx === -1 || i < bestIdx) {
              bestIdx = i
              bestPattern = pat
            }
          }
        }
      }
      if (bestIdx === -1) {
        // Manual tag without any pattern hit — orphan that no calibration
        // touch can recover. Log to surface for separate review.
        overrides.push({
          productSlug: p.slug,
          tagSlug: slug,
          ingredient: '(none)',
          position: 0,
          kind: p.kind as ProductKind,
          name: p.name,
          inciExcerpt: tokens.slice(0, 5).join(', '),
        })
        continue
      }

      // Excerpt: 1 token before through 5 tokens after the match.
      const start = Math.max(0, bestIdx - 1)
      const end = Math.min(tokens.length, bestIdx + 5)
      const inciExcerpt = tokens.slice(start, end).join(', ')

      overrides.push({
        productSlug: p.slug,
        tagSlug: slug,
        ingredient: bestPattern,
        position: bestIdx + 1,
        kind: p.kind as ProductKind,
        name: p.name,
        inciExcerpt,
      })
    }
  }

  console.log(`📊 Stats`)
  console.log(`   ${subset.length} produits éligibles`)
  console.log(`   ${withManual} avec ≥ 1 tag manual aha/bha/pha`)
  console.log(`   ${scanned} scannés (INCI non-vide)`)
  console.log(`   ${detectorAgrees} où détecteur fire (cap respecté → no override)`)
  console.log(`   ${overrides.length} overrides (manual past cap)\n`)

  if (overrides.length === 0) {
    console.log(`   ✅ Aucun override à reviewer.\n`)
    return
  }

  const byTag: Record<TargetSlug, number> = { aha: 0, bha: 0, pha: 0 }
  for (const o of overrides) byTag[o.tagSlug]++
  console.log(`📦 Par cluster`)
  for (const slug of TARGET_SLUGS) {
    console.log(`   ${slug.toUpperCase().padEnd(4)} ${byTag[slug]}`)
  }
  console.log()

  // Position buckets — borderline 10–14 vs deep tail 20+ matters for
  // the case-by-case call.
  const buckets: Record<TargetSlug, [number, number, number, number]> = {
    aha: [0, 0, 0, 0],
    bha: [0, 0, 0, 0],
    pha: [0, 0, 0, 0],
  }
  for (const o of overrides) {
    const b = buckets[o.tagSlug]
    if (o.position === 0)
      b[3]++ // orphan (no pattern hit)
    else if (o.position <= 14) b[0]++
    else if (o.position <= 19) b[1]++
    else b[2]++
  }
  console.log(`📐 Position buckets`)
  console.log(`   slug  10–14  15–19   20+   orphan`)
  for (const slug of TARGET_SLUGS) {
    const [near, mid, deep, orphan] = buckets[slug]
    console.log(
      `   ${slug.padEnd(4)} ${String(near).padStart(5)}  ${String(mid).padStart(5)}  ${String(deep).padStart(4)}  ${String(orphan).padStart(6)}`
    )
  }
  console.log()

  const byTagIng = new Map<TargetSlug, Map<string, number>>()
  for (const o of overrides) {
    let m = byTagIng.get(o.tagSlug)
    if (!m) {
      m = new Map()
      byTagIng.set(o.tagSlug, m)
    }
    m.set(o.ingredient, (m.get(o.ingredient) ?? 0) + 1)
  }
  for (const slug of TARGET_SLUGS) {
    const m = byTagIng.get(slug)
    if (!m) continue
    console.log(`🧪 ${slug.toUpperCase()} top ingredients`)
    const top = [...m.entries()].sort((a, b) => b[1] - a[1])
    for (const [ing, n] of top) console.log(`   ${String(n).padStart(5)} × ${ing}`)
    console.log()
  }

  const byTagKind = new Map<TargetSlug, Map<string, number>>()
  for (const o of overrides) {
    let m = byTagKind.get(o.tagSlug)
    if (!m) {
      m = new Map()
      byTagKind.set(o.tagSlug, m)
    }
    m.set(o.kind, (m.get(o.kind) ?? 0) + 1)
  }
  for (const slug of TARGET_SLUGS) {
    const m = byTagKind.get(slug)
    if (!m) continue
    console.log(`📦 ${slug.toUpperCase()} top kinds`)
    const top = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
    for (const [k, n] of top) console.log(`   ${String(n).padStart(5)} × ${k}`)
    console.log()
  }

  overrides.sort((a, b) => {
    if (a.tagSlug !== b.tagSlug) return a.tagSlug.localeCompare(b.tagSlug)
    if (a.position !== b.position) return a.position - b.position
    return a.productSlug.localeCompare(b.productSlug)
  })

  // Auto-classification pre-pass — counted regardless of CSV output mode.
  const verdicts: Verdict[] = overrides.map(classify)
  const counts: Record<Verdict, number> = { delete: 0, keep: 0, borderline: 0 }
  for (const v of verdicts) counts[v]++
  console.log(`🧮 Auto-classification`)
  console.log(`   delete       ${counts.delete}`)
  console.log(`   keep         ${counts.keep}`)
  console.log(`   borderline   ${counts.borderline}\n`)

  if (CSV_OUT) {
    const lines = [csvHeader()]
    for (const o of overrides) lines.push(csvLine(o))
    await Bun.write(CSV_OUT, lines.join('\n') + '\n')
    console.log(`📄 CSV écrit : ${CSV_OUT} (${overrides.length} lignes)\n`)
  }

  if (CSV_DIR) {
    const buckets: Record<Verdict, string[]> = {
      delete: [csvHeader()],
      keep: [csvHeader()],
      borderline: [csvHeader()],
    }
    for (let i = 0; i < overrides.length; i++) {
      buckets[verdicts[i]].push(csvLine(overrides[i]))
    }
    for (const v of ['delete', 'keep', 'borderline'] as Verdict[]) {
      const path = `${CSV_DIR.replace(/\/$/, '')}/${v}.csv`
      await Bun.write(path, buckets[v].join('\n') + '\n')
      console.log(`📄 CSV écrit : ${path} (${buckets[v].length - 1} lignes)`)
    }
    console.log()
  }
}

function csvHeader(): string {
  return 'product_slug,tag_slug,ingredient,position,kind,name,inci_excerpt'
}

function csvLine(o: OverrideRow): string {
  return [
    o.productSlug,
    o.tagSlug,
    csvEscape(o.ingredient),
    String(o.position),
    o.kind,
    csvEscape(o.name),
    csvEscape(o.inciExcerpt),
  ].join(',')
}

// Apply destructive DELETEs from an explicit CSV (cleanup pipeline).
//
// The audit's auto-classification is opinionated; the user always reviews
// borderline rows before deletion. This mode reads the final
// (product_slug, tag_slug) list as data, never as policy — so the same
// runner can apply different cleanup decisions across sessions without
// the verdict logic living in code.
async function applyDeletions(): Promise<void> {
  if (!APPLY_FROM_CSV) {
    throw new Error('APPLY=1 requires APPLY_FROM_CSV (path to CSV inside container)')
  }

  console.log(`🗑  APPLY mode — DELETE pairs from ${APPLY_FROM_CSV}`)

  const file = Bun.file(APPLY_FROM_CSV)
  const text = await file.text()
  const lines = text.split('\n').filter((l) => l.trim() !== '')
  if (lines.length < 2) {
    throw new Error(`${APPLY_FROM_CSV}: empty or missing header`)
  }
  const header = lines[0].split(',')
  const colSlug = header.indexOf('product_slug')
  const colTag = header.indexOf('tag_slug')
  if (colSlug < 0 || colTag < 0) {
    throw new Error(
      `${APPLY_FROM_CSV}: header must include product_slug and tag_slug (got ${lines[0]})`
    )
  }

  type Pair = { productSlug: string; tagSlug: string }
  const pairs: Pair[] = []
  for (const line of lines.slice(1)) {
    // Naive split — apply CSVs are runner-generated, no embedded quotes
    // expected in slug / tag columns (slugs are kebab-case ASCII).
    const cols = line.split(',')
    const ps = (cols[colSlug] ?? '').trim()
    const ts = (cols[colTag] ?? '').trim()
    if (!ps || !ts) continue
    if (!TARGET_SLUGS.includes(ts as TargetSlug)) {
      throw new Error(`${APPLY_FROM_CSV}: tag_slug ${ts} outside ${TARGET_SLUGS.join(',')}`)
    }
    pairs.push({ productSlug: ps, tagSlug: ts })
  }

  console.log(`   ${pairs.length} pairs à supprimer\n`)

  // SET LOCAL only persists within the active transaction — wrap the
  // entire write block so RLS sees the elevated role.
  let deleted = 0
  let missing = 0
  let notFound = 0
  await db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL app.role = 'admin'`)

    const slugSet = new Set(pairs.map((p) => p.productSlug))
    const productRows = await tx
      .select({ id: products.id, slug: products.slug })
      .from(products)
      .where(inArray(products.slug, [...slugSet]))
    const productIdBySlug = new Map<string, string>()
    for (const r of productRows) productIdBySlug.set(r.slug, r.id)

    const tagDefRows = await tx
      .select({ id: productTagsDefs.id, slug: productTagsDefs.slug })
      .from(productTagsDefs)
      .where(inArray(productTagsDefs.slug, [...TARGET_SLUGS]))
    const tagIdBySlug = new Map<string, string>()
    for (const r of tagDefRows) tagIdBySlug.set(r.slug, r.id)

    for (const { productSlug, tagSlug } of pairs) {
      const pid = productIdBySlug.get(productSlug)
      const tid = tagIdBySlug.get(tagSlug)
      if (!pid || !tid) {
        missing++
        console.log(`   ⚠ unresolved ${productSlug} / ${tagSlug}`)
        continue
      }
      const result = await tx
        .delete(tagProducts)
        .where(sql`${tagProducts.productId} = ${pid} AND ${tagProducts.productTagId} = ${tid}`)
      // Bun-postgres / drizzle returns the executed-row count under `count`
      // (not `rowCount` like node-postgres). Falling back to rowCount keeps
      // the runner portable if the driver swap.
      const r = result as unknown as { count?: number; rowCount?: number }
      const rowCount = r.count ?? r.rowCount ?? 0
      if (rowCount === 0) notFound++
      else deleted += rowCount
    }
  })

  console.log(`\n📊 APPLY summary`)
  console.log(`   ${deleted} pairs supprimées`)
  if (notFound > 0) console.log(`   ${notFound} pairs déjà absentes (no-op)`)
  if (missing > 0) console.log(`   ${missing} pairs avec slug/tag introuvable (skipped)`)
  console.log()
}

function csvEscape(v: string): string {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) {
    return `"${v.replace(/"/g, '""')}"`
  }
  return v
}

if (import.meta.main || process.argv[1]?.endsWith('audit-aha-bha-pha-overrides.ts')) {
  main().catch((err) => {
    console.error('\n💥 Erreur :', err instanceof Error ? err.message : err)
    if (err instanceof Error && err.stack) console.error(err.stack)
    process.exit(1)
  })
}
