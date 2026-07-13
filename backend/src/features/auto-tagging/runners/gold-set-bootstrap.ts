// Stratified sampler for the auto-tag gold set (audit O2).
//
// Read-only on the DB; writes one JSON file (annotations.json) at the path
// given by GOLD_SET_PATH (default: backend/src/features/auto-tagging/data/gold-set/annotations.json).
// Idempotent: existing annotations are preserved verbatim. Only entries
// missing from the file get a fresh skeleton (empty present/absent) so the
// annotator can pick up where they left off.
//
// Sampling strategy
// For each focus tag (GOLD_SET_FOCUS_TAGS, gold-set/fixtures.ts), we draw:
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
// Seeded PRNG (mulberry32, SEED env). Same SEED + same DB state = same draw.
// Re-running with a higher SAMPLE_SIZE adds new products on top of the
// previous draw; the previous selection stays stable.
//
// Tunables via env:
//   SAMPLE_SIZE         optional 70: total unique products to draw
//   POSITIVES_PER_TAG   optional 4: currently-tagged samples per tag
//   NEGATIVES_PER_TAG   optional 2: currently-untagged samples per tag
//   SEED                optional 42: PRNG seed
//   GOLD_SET_PATH       optional: output JSON path

import path from 'node:path'

import type { ProductKind } from '@aurore/shared'

import { inArray } from 'drizzle-orm'

import { db } from '../../../db'
import { productTagLinks, productTagTypes } from '../../../db/schema'
import {
  GOLD_SET_FOCUS_TAGS,
  GOLD_SET_SCHEMA_VERSION,
  type GoldSetAnnotation,
  type GoldSetFile,
  type GoldSetFocusTag,
  loadGoldSet,
  serializeGoldSet,
} from '../gold-set/fixtures'
import { fetchEligibleProducts } from './audit/db'

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

interface Pools {
  positives: ProductRow[]
  negatives: ProductRow[]
}

interface PoolsState {
  poolsByTag: Map<GoldSetFocusTag, Pools>
  kindFreqByTag: Map<GoldSetFocusTag, Map<string, number>>
}

interface SelectionEntry {
  product: ProductRow
  sampledFor: Set<GoldSetFocusTag>
}

interface MergeResult {
  merged: GoldSetAnnotation[]
  newCount: number
  preservedFilled: number
  updatedSampledFor: number
}

function validateParams(): void {
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
}

function logHeader(): void {
  console.log(`🌱 Gold-set bootstrap`)
  console.log(
    `   target=${SAMPLE_SIZE} · positives_per_tag=${POSITIVES_PER_TAG} · negatives_per_tag=${NEGATIVES_PER_TAG} · seed=${SEED}`
  )
  console.log(`   out=${GOLD_SET_PATH}\n`)
}

// Filtered to focus tags only; other tags are irrelevant for sampling.
async function fetchTagsByProduct(): Promise<Map<string, Set<string>>> {
  const focusTagDefIds = await db
    .select({ id: productTagTypes.id, slug: productTagTypes.slug })
    .from(productTagTypes)
    .where(inArray(productTagTypes.slug, [...GOLD_SET_FOCUS_TAGS]))

  const tagPairs =
    focusTagDefIds.length === 0
      ? []
      : await db
          .select({ pId: productTagLinks.productId, defId: productTagLinks.productTagId })
          .from(productTagLinks)
          .where(
            inArray(
              productTagLinks.productTagId,
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
  return tagsByProduct
}

function buildPools(eligible: ProductRow[], tagsByProduct: Map<string, Set<string>>): PoolsState {
  const poolsByTag = new Map<GoldSetFocusTag, Pools>()
  for (const tag of GOLD_SET_FOCUS_TAGS) poolsByTag.set(tag, { positives: [], negatives: [] })

  // Track dominant kind per tag so negatives are drawn from the same kind.
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
  return { poolsByTag, kindFreqByTag }
}

// Computed after positives so the dominant kind per tag is known.
function addNegativesToPools(
  eligible: ProductRow[],
  tagsByProduct: Map<string, Set<string>>,
  { poolsByTag, kindFreqByTag }: PoolsState
): void {
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
}

function logCorpus(allLen: number, eligibleLen: number): void {
  console.log(`📊 Corpus`)
  console.log(`   ${allLen} produits éligibles`)
  console.log(`   ${eligibleLen} avec INCI (les seuls candidats)\n`)
}

function logPoolsTable({ poolsByTag, kindFreqByTag }: PoolsState): void {
  console.log(`📋 Pools par tag`)
  const rows: Array<{ tag: GoldSetFocusTag; '+': number; '-': number; 'dominant kind': string }> =
    []
  for (const tag of GOLD_SET_FOCUS_TAGS) {
    const pools = poolsByTag.get(tag)
    const freq = kindFreqByTag.get(tag)
    if (!pools || !freq) continue
    const dom = pickDominantKind(freq) ?? '—'
    rows.push({
      tag,
      '+': pools.positives.length,
      '-': pools.negatives.length,
      'dominant kind': dom,
    })
  }
  console.table(rows)
}

// sampledFor accumulates every tag that selected the same product (multi-tag products).
function drawSelection(state: PoolsState): Map<string, SelectionEntry> {
  const rng = mulberry32(SEED >>> 0)
  for (const pools of state.poolsByTag.values()) {
    shuffleInPlace(pools.positives, rng)
    shuffleInPlace(pools.negatives, rng)
  }

  const selected = new Map<string, SelectionEntry>()
  // Shuffle already interleaves kinds; taking the first POSITIVES_PER_TAG entries
  // is approximate stratification, adequate at current corpus scale.
  drawRound(state.poolsByTag, selected, POSITIVES_PER_TAG, 'positives')
  drawRound(state.poolsByTag, selected, NEGATIVES_PER_TAG, 'negatives')
  return selected
}

function drawRound(
  poolsByTag: Map<GoldSetFocusTag, Pools>,
  selected: Map<string, SelectionEntry>,
  perTagCap: number,
  side: 'positives' | 'negatives'
): void {
  const quotaUsed = new Map<GoldSetFocusTag, number>()
  for (const tag of GOLD_SET_FOCUS_TAGS) quotaUsed.set(tag, 0)
  let madeProgress = true
  while (selected.size < SAMPLE_SIZE && madeProgress) {
    madeProgress = false
    for (const tag of GOLD_SET_FOCUS_TAGS) {
      if (selected.size >= SAMPLE_SIZE) break
      const used = quotaUsed.get(tag) ?? 0
      if (used >= perTagCap) continue
      const pools = poolsByTag.get(tag)
      if (!pools) continue
      const next = popNextUnselected(pools[side], selected)
      if (!next) continue
      addSelection(selected, next, tag)
      quotaUsed.set(tag, used + 1)
      madeProgress = true
    }
  }
}

// Additive: entries not in the new draw are preserved. Only empty entries get sampledFor updated.
function mergeAnnotations(
  existing: GoldSetFile,
  selected: Map<string, SelectionEntry>
): MergeResult {
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
    // Update sampledFor only on empty entries to avoid churning the file on every run.
    if (a.present.length === 0 && a.absent.length === 0) {
      const newSampledFor = [...sel.sampledFor].sort()
      const oldSampledFor = [...(a.sampledFor ?? [])].sort()
      if (JSON.stringify(newSampledFor) !== JSON.stringify(oldSampledFor)) {
        updatedSampledFor++
      }
      merged.push({ ...a, sampledFor: newSampledFor })
    } else {
      merged.push(a)
      preservedFilled++
    }
  }

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

  return { merged, newCount, preservedFilled, updatedSampledFor }
}

function logFinal(merged: MergeResult, existingLen: number): void {
  console.log(`📝 Fichier`)
  console.log(`   ${merged.merged.length} entrées totales (était ${existingLen})`)
  console.log(
    `   + ${merged.newCount} nouvelles · ↺ ${merged.updatedSampledFor} sampledFor mis à jour`
  )
  console.log(`   ${merged.preservedFilled} entrées avec annotations remplies (préservées)\n`)
  console.log(`✨ Bootstrap terminé. Édite ${GOLD_SET_PATH} pour annoter les nouvelles entrées.\n`)
}

async function main() {
  validateParams()
  logHeader()

  const all = await fetchEligibleProducts()
  // Only products with an INCI can be annotated; the sampler draws from those.
  const eligible = all.filter((p) => !!p.inci?.trim())
  logCorpus(all.length, eligible.length)

  const tagsByProduct = await fetchTagsByProduct()
  const poolsState = buildPools(eligible, tagsByProduct)
  addNegativesToPools(eligible, tagsByProduct, poolsState)
  logPoolsTable(poolsState)

  const selected = drawSelection(poolsState)
  console.log(`🎯 Sélection`)
  console.log(`   ${selected.size} produits uniques choisis (target ${SAMPLE_SIZE})\n`)

  const existing = await tryLoadExisting(GOLD_SET_PATH)
  const result = mergeAnnotations(existing, selected)

  const file: GoldSetFile = {
    schemaVersion: GOLD_SET_SCHEMA_VERSION,
    ...(existing.rulesetVersion ? { rulesetVersion: existing.rulesetVersion } : {}),
    annotations: result.merged,
  }
  await Bun.write(GOLD_SET_PATH, serializeGoldSet(file))

  logFinal(result, existing.annotations.length)
}

function pickDominantKind(freq: Map<string, number>): string | null {
  let dominantKind: string | null = null
  let dominantCount = 0
  for (const [kind, count] of freq) {
    if (count > dominantCount) {
      dominantKind = kind
      dominantCount = count
    }
  }
  return dominantKind
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
  selected: Map<string, SelectionEntry>,
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

// Mulberry32: deterministic 32-bit PRNG. Not a cryptographic RNG.
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

if (import.meta.main || process.argv[1]?.endsWith('gold-set-bootstrap.ts')) {
  main().catch((err) => {
    console.error('\n💥 Erreur :', err instanceof Error ? err.message : err)
    if (err instanceof Error && err.stack) console.error(err.stack)
    process.exit(1)
  })
}
