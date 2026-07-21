// Backfill `product_ingredients` from `products.inci` for products that carry an
// INCI string but have zero ingredient links today. Reads the `inci` column only;
// no network, no scraping, never creates ingredient rows. Idempotent: the eligible
// query re-selects whatever is unlinked, so it is safe to re-run after a db reset.
//
// Pipeline per token: aurore inci-index direct hit first; on a miss, resolve through
// algo-derm's alias index (+ botanical strip) to canonical evidence, then bridge that
// evidence back onto an aurore slug. Order follows the INCI order (concentration desc),
// excipients are dropped, capped at 8 key actives.
//
// Usage (dry-run by default):
//   bun run backend/src/db/seed/inci/link-ingredients/main.ts            # dry-run report
//   bun run backend/src/db/seed/inci/link-ingredients/main.ts --write    # apply inserts
//   bun run backend/src/db/seed/inci/link-ingredients/main.ts --slug <s> # single product (re-link)
//   LIMIT=200 bun run .../main.ts                                        # cap product count (dev)

import { normalize, splitINCI } from 'algo-derm'
import { buildAliasIndex, MERGED_EVIDENCE_DB, stripBotanicalParts } from 'algo-derm/engine'
import { and, eq, isNotNull, isNull, sql } from 'drizzle-orm'

import { parseIntEnv, parseWriteSlugArgs } from '../../../../features/auto-tagging/runners/cli-args'
import { addManyIngredientsToProduct } from '../../../../features/products/product-ingredients/product-ingredients.service'
import { freqTable } from '../../../../lib/report'
import type { Transaction } from '../../../index'
import { withAdminRls } from '../../../rls'
import { ingredients, productIngredients, products } from '../../../schema'
import { INGREDIENT_SLUGS } from '../../data/ingredients/ingredient-slugs'
import { FILLER_SLUGS } from '../../data/ingredients/skincare/seed-dermo-profiles-fillers'
import { fetchIdMaps } from '../../utils/id-maps'
import {
  buildExcipientSlugs,
  buildInciIndex,
  buildSlugDomainMap,
  EXCIPIENT_BLOCKLIST,
  foldScraperDelimiters,
  getDomainAllowlist,
  normalizeInciToken,
} from '../index'
import { bridgeEvidenceToSlug, buildSlugByHumanized } from './bridge'

const { write: WRITE, slug: SLUG_ARG } = parseWriteSlugArgs()
const LIMIT = parseIntEnv('LIMIT')
if (LIMIT !== null && LIMIT < 0) throw new Error(`LIMIT must be at least 0, got "${LIMIT}"`)

const MAX_KEY_INGREDIENTS = 8

interface EligibleProduct {
  id: string
  slug: string
  inci: string | null
  category: string
}

interface ComputeResult {
  slugs: string[]
  unbridged: string[]
  blocked: string[]
  uppercaseMegaTokens: string[]
  nonUppercaseMegaTokens: string[]
}

const aliasIndex = buildAliasIndex(MERGED_EVIDENCE_DB)
const inciIndex = buildInciIndex()
const slugByHumanized = buildSlugByHumanized(Object.values(INGREDIENT_SLUGS))
// Full slug → domain map (not just inci-indexed slugs) so a humanised-word-bridged slug
// gets the same category filter as a direct hit. See computeLinks domain guard below.
const slugToDomain = buildSlugDomainMap()

// Drop resolved slugs that are fillers/excipients, whichever raw token produced them.
// Union of the is_filler taxonomy (FILLER_SLUGS) and slugs reachable from EXCIPIENT_BLOCKLIST
// tokens. Checked on the RESOLVED slug so a non-blocklisted synonym that bridges to an excipient
// (e.g. `Gomme Xanthane` → xanthan-gum) is caught. resolveToken's raw-token check only sees
// literal blocklist strings.
const blockedSlugs = new Set<string>([...FILLER_SLUGS, ...buildExcipientSlugs()])

// A token resolves to an aurore slug, or to algo-derm evidence that bridges to no aurore
// slug (unbridged), or to nothing (null). Discriminated so a bridge miss can
// never masquerade as an empty-string slug.
type Resolved = { kind: 'slug'; slug: string } | { kind: 'unbridged' }

// DB-backed fallback: algo-derm's `evidence.inci` is exactly what backfill-canonical-key.ts
// stores in `ingredients.canonical_key`, so a bridge miss can still land on an aurore slug
// whose only link to this substance is that shared identity (the humanised bridge misses
// `-hair` shadows and FR slugs — `zinc oxyde` ≠ `zinc oxide`). The category domain guard in
// computeLinks still filters the resolved slug, so a mismatch drops instead of mis-linking.
function resolveToken(raw: string, canonicalKeyToSlug: Map<string, string>): Resolved | null {
  const normAurore = normalizeInciToken(raw)
  if (!normAurore || EXCIPIENT_BLOCKLIST.has(normAurore)) return null

  const direct = inciIndex.get(normAurore)
  if (direct) return { kind: 'slug', slug: direct.slug }

  const normAd = normalize(raw)
  let evidence = aliasIndex.get(normAd)
  if (!evidence) {
    const stripped = stripBotanicalParts(normAd)
    if (stripped) evidence = aliasIndex.get(stripped)
  }
  if (!evidence) return null

  const bridged = bridgeEvidenceToSlug(evidence, inciIndex, slugByHumanized)
  if (bridged) return { kind: 'slug', slug: bridged }

  const byCanonical = canonicalKeyToSlug.get(evidence.inci)
  if (byCanonical) return { kind: 'slug', slug: byCanonical }

  return { kind: 'unbridged' }
}

// A single "token" carrying this many words is far past the longest real INCI name
// (~6 words). The string most likely lost its separators upstream. Uppercase share
// splits glued INCI (`AQUA CYCLOPENTASILOXANE …`) from French prose/nutrition text
// (descriptions, supplement composition), which is expected non-INCI content.
const SUSPECT_TOKEN_WORDS = 8

function isUppercaseDominant(s: string): boolean {
  const letters = s.replace(/[^A-Za-zÀ-ÿ]/g, '')
  if (letters.length === 0) return false
  const upper = letters.replace(/[^A-ZÀ-Þ]/g, '')
  return upper.length / letters.length >= 0.6
}

function computeLinks(
  inci: string,
  category: string,
  canonicalKeyToSlug: Map<string, string>
): ComputeResult {
  const allowed = getDomainAllowlist(category)
  // splitINCI only splits on commas (+ protects decimals). Fold scraper artifacts first.
  // Supplement text keeps list separators because its dashes and semicolons separate doses.
  const tokens = splitINCI(
    foldScraperDelimiters(inci, { foldListSeparators: category !== 'complement' })
  )

  const seen = new Set<string>()
  const slugs: string[] = []
  const unbridged: string[] = []
  const blocked: string[] = []
  const uppercaseMegaTokens: string[] = []
  const nonUppercaseMegaTokens: string[] = []

  for (const raw of tokens) {
    const resolved = resolveToken(raw, canonicalKeyToSlug)
    if (!resolved) {
      const trimmed = raw.trim()
      if (trimmed.split(/\s+/).length >= SUSPECT_TOKEN_WORDS) {
        ;(isUppercaseDominant(trimmed) ? uppercaseMegaTokens : nonUppercaseMegaTokens).push(trimmed)
      }
      continue
    }
    if (resolved.kind === 'unbridged') {
      unbridged.push(raw.trim())
      continue
    }
    const { slug } = resolved
    // F2: drop filler/excipient by resolved slug before the cap so it never eats a slot.
    if (blockedSlugs.has(slug)) {
      blocked.push(slug)
      continue
    }
    if (seen.has(slug)) continue
    const domain = slugToDomain.get(slug)
    // Fail closed: drop a slug whose domain is unknown or foreign to the product category.
    if (allowed && (!domain || !allowed.has(domain))) continue
    seen.add(slug)
    slugs.push(slug)
    if (slugs.length >= MAX_KEY_INGREDIENTS) break
  }

  return { slugs, unbridged, blocked, uppercaseMegaTokens, nonUppercaseMegaTokens }
}

async function readEligible(tx: Transaction): Promise<EligibleProduct[]> {
  if (SLUG_ARG) {
    // --slug: load unconditionally (re-link override), ignore the 0-link filter.
    return tx
      .select({
        id: products.id,
        slug: products.slug,
        inci: products.inci,
        category: products.category,
      })
      .from(products)
      .where(eq(products.slug, SLUG_ARG))
  }

  const rows = await tx
    .select({
      id: products.id,
      slug: products.slug,
      inci: products.inci,
      category: products.category,
    })
    .from(products)
    .leftJoin(productIngredients, eq(productIngredients.productId, products.id))
    .where(
      and(
        isNotNull(products.inci),
        sql`btrim(${products.inci}) <> ''`,
        isNull(productIngredients.productId)
      )
    )

  return LIMIT === null ? rows : rows.slice(0, LIMIT)
}

// Thrown to roll back the read-only dry-run transaction so nothing persists.
class DryRunRollback extends Error {}

// Bucket observed signals, not assumed causes. Every bucket keeps samples for review.
type ZeroBucket =
  | 'uppercase-mega-token'
  | 'non-uppercase-mega-token'
  | 'resolved-but-unbridged'
  | 'blocked-only'
  | 'nothing-recognized'
  | 'no-inci'

function classifyZeroLink(r: ComputeResult): ZeroBucket {
  if (r.uppercaseMegaTokens.length > 0) return 'uppercase-mega-token'
  if (r.nonUppercaseMegaTokens.length > 0) return 'non-uppercase-mega-token'
  if (r.unbridged.length > 0) return 'resolved-but-unbridged'
  if (r.blocked.length > 0) return 'blocked-only'
  return 'nothing-recognized'
}

interface RunStats {
  withLinks: number
  zeroLinks: number
  totalPairs: number
  missingId: number
  slugFreq: Map<string, number>
  unbridgedFreq: Map<string, number>
  blockedFreq: Map<string, number>
  zeroBuckets: Map<ZeroBucket, string[]>
}

const ZERO_BUCKET_LABELS: Record<ZeroBucket, string> = {
  'uppercase-mega-token': 'uppercase mega-token (possible missing separators, review)',
  'non-uppercase-mega-token': 'non-uppercase mega-token (possible prose or malformed INCI, review)',
  'resolved-but-unbridged': 'resolved by algo-derm but missing an aurore bridge (review)',
  'blocked-only': 'all resolved slugs are known fillers/excipients',
  'nothing-recognized': 'nothing recognized (obscure botanicals or index gap, review)',
  'no-inci': 'no INCI on the requested product',
}

function printReport(s: RunStats): void {
  console.log('Summary')
  console.table({
    'products ≥1 link': s.withLinks,
    'products 0 link': s.zeroLinks,
    'total pairs': s.totalPairs,
    ...(s.missingId > 0 ? { 'slugs w/o id row (dropped)': s.missingId } : {}),
  })

  console.log('top 10 linked slugs')
  const topLinked = freqTable(s.slugFreq, 10, 'slug')
  if (topLinked.length > 0) console.table(topLinked)

  // Unbridged tokens should be excipients algo-derm knows without an aurore
  // row (1,2-hexanediol, fatty esters, CI colours). Actives here = a bridge gap → investigate.
  console.log('top 20 resolved-but-unbridged tokens (expect excipients, not actives)')
  const topUnbridged = freqTable(s.unbridgedFreq, 20, 'token')
  if (topUnbridged.length > 0) console.table(topUnbridged)

  console.log('top 15 slugs dropped as filler/excipient (F2 slug-level block)')
  const topBlocked = freqTable(s.blockedFreq, 15, 'slug')
  if (topBlocked.length > 0) console.table(topBlocked)

  console.log('0-link products by cause')
  for (const [bucket, slugs] of s.zeroBuckets) {
    console.log(`  ${slugs.length}\t${ZERO_BUCKET_LABELS[bucket]}`)
    if (slugs.length > 0) console.log(`  \tsample: ${slugs.slice(0, 8).join(', ')}`)
  }
}

async function main() {
  console.log(
    `\n🔗 INCI → product_ingredients linking (${WRITE ? 'WRITE' : 'DRY-RUN'})` +
      (SLUG_ARG ? ` · slug=${SLUG_ARG}` : LIMIT !== null ? ` · limit=${LIMIT}` : '')
  )
  console.log(`   alias index: ${aliasIndex.size} keys · inci index: ${inciIndex.size} tokens\n`)

  await withAdminRls(async (tx) => {
    const { ingredientSlugToId } = await fetchIdMaps(tx)

    // canonical_key → slug fallback map. Prefer a non `-hair` slug so a skincare product
    // lands on the bare slug instead of its haircare shadow (both share the key).
    const keyRows = await tx
      .select({ slug: ingredients.slug, key: ingredients.canonicalKey })
      .from(ingredients)
      .where(isNotNull(ingredients.canonicalKey))
    const canonicalKeyToSlug = new Map<string, string>()
    for (const { slug, key } of keyRows) {
      if (!key) continue
      const cur = canonicalKeyToSlug.get(key)
      if (!cur || (cur.endsWith('-hair') && !slug.endsWith('-hair'))) {
        canonicalKeyToSlug.set(key, slug)
      }
    }
    console.log(`   canonical_key fallback map: ${canonicalKeyToSlug.size} keys`)

    const eligible = await readEligible(tx)
    console.log(`   eligible products: ${eligible.length}\n`)

    let withLinks = 0
    let zeroLinks = 0
    let totalPairs = 0
    const slugFreq = new Map<string, number>()
    const unbridgedFreq = new Map<string, number>()
    const blockedFreq = new Map<string, number>()
    const zeroBuckets = new Map<ZeroBucket, string[]>([
      ['uppercase-mega-token', []],
      ['non-uppercase-mega-token', []],
      ['resolved-but-unbridged', []],
      ['blocked-only', []],
      ['nothing-recognized', []],
      ['no-inci', []],
    ])
    let missingId = 0

    for (const product of eligible) {
      // A slug-scoped run is a replacement, including replacement with no links.
      if (WRITE && SLUG_ARG) {
        await tx.delete(productIngredients).where(eq(productIngredients.productId, product.id))
      }
      if (!product.inci) {
        zeroLinks++
        zeroBuckets.get('no-inci')?.push(product.slug)
        continue
      }
      const computed = computeLinks(product.inci, product.category, canonicalKeyToSlug)
      const { slugs, unbridged, blocked } = computed
      for (const u of unbridged) {
        unbridgedFreq.set(u, (unbridgedFreq.get(u) ?? 0) + 1)
      }
      for (const b of blocked) {
        blockedFreq.set(b, (blockedFreq.get(b) ?? 0) + 1)
      }

      const pairs = slugs
        .map((slug) => {
          const ingredientId = ingredientSlugToId.get(slug)
          if (!ingredientId) {
            missingId++
            return null
          }
          slugFreq.set(slug, (slugFreq.get(slug) ?? 0) + 1)
          return { productId: product.id, ingredientId }
        })
        .filter((p): p is { productId: string; ingredientId: string } => p !== null)

      if (pairs.length === 0) {
        zeroLinks++
        // Resolved slugs without an id row are seed↔DB drift: counted by missingId,
        // not a linking-cause bucket.
        if (slugs.length === 0) zeroBuckets.get(classifyZeroLink(computed))?.push(product.slug)
        continue
      }
      withLinks++
      totalPairs += pairs.length

      if (WRITE) {
        await addManyIngredientsToProduct(tx, pairs)
      }
    }

    printReport({
      withLinks,
      zeroLinks,
      totalPairs,
      missingId,
      slugFreq,
      unbridgedFreq,
      blockedFreq,
      zeroBuckets,
    })

    if (!WRITE) {
      console.log(`\n  Would insert ${totalPairs} rows. Re-run with --write.\n`)
      // Roll back the read-only transaction so nothing persists.
      throw new DryRunRollback()
    }
    console.log(`\n  ✅ Inserted links for ${withLinks} products (${totalPairs} rows).\n`)
  }).catch((err) => {
    if (err instanceof DryRunRollback) return
    throw err
  })
}

await main()
