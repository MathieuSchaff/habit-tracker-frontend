// Stratified sampler for the auto-tag gold set (audit O2).
//
// Read-only on the DB; writes one JSON file (annotations.json) at the path
// given by GOLD_SET_PATH (default: backend/src/features/auto-tagging/data/gold-set/annotations.json).
// Idempotent: existing annotations are preserved verbatim. Only entries
// missing from the file get a fresh skeleton (empty present/absent) so the
// annotator can pick up where they left off.
//
// Sampling strategy
// -----------------
// For each focus tag (16 total — 9 actif-class clusters, 4 sensoriels T1,
// 3 acid clusters), we draw:
//   - POSITIVES_PER_TAG products that currently carry the tag in DB. Picked
//     to span product kinds so the metric isn't dominated by serum-only.
//   - NEGATIVES_PER_TAG products that currently lack the tag but share the
//     dominant kind for that tag. These exercise FP detection.
//
// Round-robin draws across tags (so a tag with few candidates doesn't get
// starved) until SAMPLE_SIZE unique products is reached. A multi-tag product
// (e.g. a retinoid serum that's also vitamin-c) only counts once toward the
// budget but its `sampledFor` field records every tag that recommended it,
// helping the annotator focus when triaging.
//
// Determinism
// -----------
// Seeded PRNG (mulberry32, SEED env). Same SEED + same DB state = same draw.
// Re-running with a higher SAMPLE_SIZE adds new products on top of the
// previous draw; the previous selection stays stable.
//
// Tunables via env:
//   SAMPLE_SIZE         optional 70    — total unique products to draw
//   POSITIVES_PER_TAG   optional 4     — currently-tagged samples per tag
//   NEGATIVES_PER_TAG   optional 2     — currently-untagged samples per tag
//   SEED                optional 42    — PRNG seed
//   GOLD_SET_PATH       optional       — output JSON path

import path from 'node:path'

import type { ProductKind } from '@habit-tracker/shared'

import { inArray, sql } from 'drizzle-orm'

import { db } from '../../../db'
import { products, productTagsDefs, tagProducts } from '../../../db/schema'
import {
  GOLD_SET_FOCUS_TAGS,
  GOLD_SET_SCHEMA_VERSION,
  type GoldSetAnnotation,
  type GoldSetFile,
  type GoldSetFocusTag,
  loadGoldSet,
  serializeGoldSet,
} from '../gold-set/fixtures'
import { AUTO_TAG_ELIGIBLE_CATEGORIES } from '../orchestrator'

const SAMPLE_SIZE = Number(process.env.SAMPLE_SIZE ?? 70)
const POSITIVES_PER_TAG = Number(process.env.POSITIVES_PER_TAG ?? 4)
const NEGATIVES_PER_TAG = Number(process.env.NEGATIVES_PER_TAG ?? 2)
const SEED = Number(process.env.SEED ?? 42)
const GOLD_SET_PATH =
  process.env.GOLD_SET_PATH ??
  path.resolve(import.meta.dir, '..', 'data', 'gold-set', 'annotations.json')

interface ProductRow {
  id: string
  slug: string
  name: string
  brand: string
  kind: ProductKind
  category: string
  inci: string | null
}

async function main() {
  if (
    !Number.isFinite(SAMPLE_SIZE) ||
    SAMPLE_SIZE < 1 ||
    !Number.isFinite(POSITIVES_PER_TAG) ||
    POSITIVES_PER_TAG < 0 ||
    !Number.isFinite(NEGATIVES_PER_TAG) ||
    NEGATIVES_PER_TAG < 0
  ) {
    throw new Error(
      `Invalid sampling params: SAMPLE_SIZE=${SAMPLE_SIZE}, POSITIVES_PER_TAG=${POSITIVES_PER_TAG}, NEGATIVES_PER_TAG=${NEGATIVES_PER_TAG}`
    )
  }

  console.log(`🌱 Gold-set bootstrap`)
  console.log(
    `   target=${SAMPLE_SIZE} · positives_per_tag=${POSITIVES_PER_TAG} · negatives_per_tag=${NEGATIVES_PER_TAG} · seed=${SEED}`
  )
  console.log(`   out=${GOLD_SET_PATH}\n`)

  await db.execute(sql`SET LOCAL app.role = 'admin'`)

  const allProducts = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      brand: products.brand,
      kind: products.kind,
      category: products.category,
      inci: products.inci,
    })
    .from(products)
    .where(inArray(products.category, [...AUTO_TAG_ELIGIBLE_CATEGORIES]))

  const eligible = allProducts.filter((p) => !!p.inci?.trim())
  console.log(`📊 Corpus`)
  console.log(`   ${allProducts.length} produits éligibles`)
  console.log(`   ${eligible.length} avec INCI (les seuls candidats)\n`)

  // Pull the (productId → Set<tagSlug>) map by joining tag_products with
  // product_tags_defs. Filtered to focus tags only — anything else is irrelevant
  // for sampling.
  const focusTagDefIds = await db
    .select({ id: productTagsDefs.id, slug: productTagsDefs.slug })
    .from(productTagsDefs)
    .where(inArray(productTagsDefs.slug, [...GOLD_SET_FOCUS_TAGS]))

  const tagPairs =
    focusTagDefIds.length === 0
      ? []
      : await db
          .select({ pId: tagProducts.productId, defId: tagProducts.productTagId })
          .from(tagProducts)
          .where(
            inArray(
              tagProducts.productTagId,
              focusTagDefIds.map((r) => r.id)
            )
          )

  const slugByDefId = new Map<string, string>()
  for (const r of focusTagDefIds) slugByDefId.set(r.id, r.slug)

  const tagsByProduct = new Map<string, Set<string>>()
  for (const r of tagPairs) {
    const slug = slugByDefId.get(r.defId)
    if (!slug) continue
    let set = tagsByProduct.get(r.pId)
    if (!set) {
      set = new Set()
      tagsByProduct.set(r.pId, set)
    }
    set.add(slug)
  }

  // Per-tag candidate pools.
  type Pools = { positives: ProductRow[]; negatives: ProductRow[] }
  const poolsByTag = new Map<GoldSetFocusTag, Pools>()
  for (const tag of GOLD_SET_FOCUS_TAGS) poolsByTag.set(tag, { positives: [], negatives: [] })

  // Track the dominant kind per tag (most-frequent kind among positives) so
  // negatives are drawn from the same kind, not random across the corpus.
  const kindFreqByTag = new Map<GoldSetFocusTag, Map<string, number>>()
  for (const tag of GOLD_SET_FOCUS_TAGS) kindFreqByTag.set(tag, new Map())

  for (const p of eligible) {
    const productTags = tagsByProduct.get(p.id) ?? new Set<string>()
    for (const tag of GOLD_SET_FOCUS_TAGS) {
      if (!productTags.has(tag)) continue
      const pools = poolsByTag.get(tag)
      const freq = kindFreqByTag.get(tag)
      if (!pools || !freq) continue
      pools.positives.push(p)
      freq.set(p.kind, (freq.get(p.kind) ?? 0) + 1)
    }
  }

  // Negatives draw: sample products in the dominant kind that lack the tag.
  // Computed after the positives pass so we know each tag's dominant kind.
  for (const tag of GOLD_SET_FOCUS_TAGS) {
    const freq = kindFreqByTag.get(tag)
    const pools = poolsByTag.get(tag)
    if (!freq || !pools) continue
    const dominantKind = pickDominantKind(freq)
    if (!dominantKind) continue
    for (const p of eligible) {
      if (p.kind !== dominantKind) continue
      const productTags = tagsByProduct.get(p.id) ?? new Set<string>()
      if (productTags.has(tag)) continue
      pools.negatives.push(p)
    }
  }

  console.log(`📋 Pools par tag`)
  console.log(`   ${pad('tag', 24)} ${rpad('+', 5)} ${rpad('-', 5)} ${pad('dominant kind', 16)}`)
  console.log(`   ${'─'.repeat(24)} ${'─'.repeat(5)} ${'─'.repeat(5)} ${'─'.repeat(16)}`)
  for (const tag of GOLD_SET_FOCUS_TAGS) {
    const pools = poolsByTag.get(tag)
    const freq = kindFreqByTag.get(tag)
    if (!pools || !freq) continue
    const dom = pickDominantKind(freq) ?? '—'
    console.log(
      `   ${pad(tag, 24)} ${rpad(String(pools.positives.length), 5)} ${rpad(String(pools.negatives.length), 5)} ${pad(dom, 16)}`
    )
  }
  console.log()

  // Round-robin draw: cycle through tags, take next positive/negative until
  // we hit SAMPLE_SIZE unique products. `sampledFor` accumulates every tag
  // that selected the same product.
  const rng = mulberry32(SEED >>> 0)
  for (const pools of poolsByTag.values()) {
    shuffleInPlace(pools.positives, rng)
    shuffleInPlace(pools.negatives, rng)
  }
  const positiveQuotaUsed = new Map<GoldSetFocusTag, number>()
  const negativeQuotaUsed = new Map<GoldSetFocusTag, number>()
  for (const tag of GOLD_SET_FOCUS_TAGS) {
    positiveQuotaUsed.set(tag, 0)
    negativeQuotaUsed.set(tag, 0)
  }

  const selected = new Map<string, { product: ProductRow; sampledFor: Set<GoldSetFocusTag> }>()

  // First pass: positives — diversify by stratifying within each tag's pool
  // by kind. Stratification is approximate (we shuffled, so kinds are
  // already randomly interleaved; we simply take the first POSITIVES_PER_TAG
  // entries from the shuffle), good enough for a 60-80 sample budget.
  let progress = true
  while (selected.size < SAMPLE_SIZE && progress) {
    progress = false
    for (const tag of GOLD_SET_FOCUS_TAGS) {
      if (selected.size >= SAMPLE_SIZE) break
      const used = positiveQuotaUsed.get(tag) ?? 0
      if (used >= POSITIVES_PER_TAG) continue
      const pools = poolsByTag.get(tag)
      if (!pools) continue
      const next = popNextUnselected(pools.positives, selected)
      if (!next) continue
      addSelection(selected, next, tag)
      positiveQuotaUsed.set(tag, used + 1)
      progress = true
    }
  }

  // Second pass: negatives, same round-robin.
  progress = true
  while (selected.size < SAMPLE_SIZE && progress) {
    progress = false
    for (const tag of GOLD_SET_FOCUS_TAGS) {
      if (selected.size >= SAMPLE_SIZE) break
      const used = negativeQuotaUsed.get(tag) ?? 0
      if (used >= NEGATIVES_PER_TAG) continue
      const pools = poolsByTag.get(tag)
      if (!pools) continue
      const next = popNextUnselected(pools.negatives, selected)
      if (!next) continue
      addSelection(selected, next, tag)
      negativeQuotaUsed.set(tag, used + 1)
      progress = true
    }
  }

  console.log(`🎯 Sélection`)
  console.log(`   ${selected.size} produits uniques choisis (target ${SAMPLE_SIZE})\n`)

  // Merge with existing annotations: preserve every entry that already
  // carries any present/absent decision, append new skeletons for newly
  // sampled products. Entries the new draw doesn't include are KEPT —
  // bootstrap is additive, never destructive.
  const existing = await tryLoadExisting(GOLD_SET_PATH)
  const existingBySlug = new Map(existing.annotations.map((a) => [a.productSlug, a]))

  const merged: GoldSetAnnotation[] = []
  let newCount = 0
  let preservedFilled = 0
  let updatedSampledFor = 0

  for (const a of existing.annotations) {
    const sel = selected.get(a.productSlug)
    if (!sel) {
      merged.push(a)
      if (a.present.length > 0 || a.absent.length > 0) preservedFilled++
      continue
    }
    // Existing entry that the draw also picked. Update sampledFor only when
    // the entry is empty (otherwise we'd churn the file on every bootstrap).
    if (a.present.length === 0 && a.absent.length === 0) {
      const newSampledFor = [...sel.sampledFor].sort()
      const oldSampledFor = [...(a.sampledFor ?? [])].sort()
      if (JSON.stringify(newSampledFor) !== JSON.stringify(oldSampledFor)) {
        updatedSampledFor++
      }
      merged.push({
        ...a,
        sampledFor: newSampledFor,
      })
    } else {
      merged.push(a)
      preservedFilled++
    }
  }

  // Append products newly selected (not already in the file).
  for (const [slug, sel] of selected) {
    if (existingBySlug.has(slug)) continue
    merged.push({
      productSlug: slug,
      kind: sel.product.kind,
      category: sel.product.category,
      present: [],
      absent: [],
      annotatedAt: '',
      sampledFor: [...sel.sampledFor].sort(),
    })
    newCount++
  }

  const file: GoldSetFile = {
    schemaVersion: GOLD_SET_SCHEMA_VERSION,
    ...(existing.rulesetVersion ? { rulesetVersion: existing.rulesetVersion } : {}),
    annotations: merged,
  }

  await Bun.write(GOLD_SET_PATH, serializeGoldSet(file))

  console.log(`📝 Fichier`)
  console.log(`   ${merged.length} entrées totales (était ${existing.annotations.length})`)
  console.log(`   + ${newCount} nouvelles · ↺ ${updatedSampledFor} sampledFor mis à jour`)
  console.log(`   ${preservedFilled} entrées avec annotations remplies (préservées)\n`)
  console.log(`✨ Bootstrap terminé. Édite ${GOLD_SET_PATH} pour annoter les nouvelles entrées.\n`)
}

function pickDominantKind(freq: Map<string, number>): string | null {
  let best: string | null = null
  let bestN = 0
  for (const [k, n] of freq) {
    if (n > bestN) {
      best = k
      bestN = n
    }
  }
  return best
}

function popNextUnselected(
  pool: ProductRow[],
  selected: Map<string, unknown>
): ProductRow | undefined {
  while (pool.length > 0) {
    const next = pool.shift()
    if (!next) return undefined
    if (selected.has(next.slug)) continue
    return next
  }
  return undefined
}

function addSelection(
  selected: Map<string, { product: ProductRow; sampledFor: Set<GoldSetFocusTag> }>,
  product: ProductRow,
  tag: GoldSetFocusTag
): void {
  const existing = selected.get(product.slug)
  if (existing) {
    existing.sampledFor.add(tag)
  } else {
    selected.set(product.slug, { product, sampledFor: new Set([tag]) })
  }
}

async function tryLoadExisting(p: string): Promise<GoldSetFile> {
  const file = Bun.file(p)
  if (!(await file.exists())) {
    return { schemaVersion: GOLD_SET_SCHEMA_VERSION, annotations: [] }
  }
  return loadGoldSet(p)
}

// Mulberry32 — small, fast, deterministic 32-bit PRNG. Same seed → same
// sequence. Adequate for sampling (not a cryptographic RNG).
function mulberry32(a: number): () => number {
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffleInPlace<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
}

function pad(s: string, w: number): string {
  return s.length >= w ? s : s + ' '.repeat(w - s.length)
}

function rpad(s: string, w: number): string {
  return s.length >= w ? s : ' '.repeat(w - s.length) + s
}

if (import.meta.main || process.argv[1]?.endsWith('gold-set-bootstrap.ts')) {
  main().catch((err) => {
    console.error('\n💥 Erreur :', err instanceof Error ? err.message : err)
    if (err instanceof Error && err.stack) console.error(err.stack)
    process.exit(1)
  })
}
