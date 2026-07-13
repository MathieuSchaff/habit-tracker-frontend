// Backfill `product_ingredients` from `products.inci` for products that carry an
// INCI string but have zero ingredient links today. Reads the `inci` column only —
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

import { parseWriteSlugArgs } from '../../../../features/auto-tagging/runners/cli-args'
import { addManyIngredientsToProduct } from '../../../../features/products/product-ingredients/product-ingredients.service'
import { freqTable } from '../../../../lib/report'
import type { Transaction } from '../../../index'
import { withAdminRls } from '../../../rls'
import { productIngredients, products } from '../../../schema'
import { INGREDIENT_SLUGS } from '../../data/ingredients/ingredient-slugs'
import { FILLER_SLUGS } from '../../data/ingredients/skincare/seed-dermo-profiles-fillers'
import { fetchIdMaps } from '../../utils/id-maps'
import {
  buildExcipientSlugs,
  buildInciIndex,
  buildSlugDomainMap,
  EXCIPIENT_BLOCKLIST,
  getDomainAllowlist,
  normalizeInciToken,
} from '../index'
import { bridgeEvidenceToSlug, buildSlugByHumanized } from './bridge'

const { write: WRITE, slug: SLUG_ARG } = parseWriteSlugArgs()
const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : null

const MAX_KEY_INGREDIENTS = 8

interface EligibleProduct {
  id: string
  slug: string
  inci: string | null
  category: string
}

interface ComputeResult {
  slugs: string[]
  /** Tokens that resolved to algo-derm evidence but bridged to no aurore slug. */
  unbridged: string[]
  /** Resolved slugs dropped because they are filler/excipient (F2 slug-level block). */
  blocked: string[]
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
// (e.g. `Gomme Xanthane` → xanthan-gum) is caught — resolveToken's raw-token check only sees
// literal blocklist strings.
const blockedSlugs = new Set<string>([...FILLER_SLUGS, ...buildExcipientSlugs()])

// A token resolves to an aurore slug, or to algo-derm evidence that bridges to no aurore
// slug (unbridged), or to nothing (null). Discriminated so a bridge miss can
// never masquerade as an empty-string slug.
type Resolved = { kind: 'slug'; slug: string } | { kind: 'unbridged' }

function resolveToken(raw: string): Resolved | null {
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
  if (!bridged) return { kind: 'unbridged' }
  return { kind: 'slug', slug: bridged }
}

function computeLinks(inci: string, category: string): ComputeResult {
  const allowed = getDomainAllowlist(category)
  // `;` folded to `,` first — splitINCI only splits on commas and protects decimals.
  const tokens = splitINCI(inci.replace(/;/g, ','))

  const seen = new Set<string>()
  const slugs: string[] = []
  const unbridged: string[] = []
  const blocked: string[] = []

  for (const raw of tokens) {
    const resolved = resolveToken(raw)
    if (!resolved) continue
    if (resolved.kind === 'unbridged') {
      unbridged.push(raw.trim())
      continue
    }
    const { slug } = resolved
    // F2: drop filler/excipient by resolved slug BEFORE the cap so it never eats a slot.
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

  return { slugs, unbridged, blocked }
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

  return LIMIT ? rows.slice(0, LIMIT) : rows
}

// Thrown to roll back the read-only dry-run transaction so nothing persists.
class DryRunRollback extends Error {}

interface RunStats {
  withLinks: number
  zeroLinks: number
  totalPairs: number
  missingId: number
  slugFreq: Map<string, number>
  unbridgedFreq: Map<string, number>
  blockedFreq: Map<string, number>
  zeroSamples: string[]
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

  console.log(`sample 0-link products: ${s.zeroSamples.join(', ')}`)
}

async function main() {
  console.log(
    `\n🔗 INCI → product_ingredients linking (${WRITE ? 'WRITE' : 'DRY-RUN'})` +
      (SLUG_ARG ? ` · slug=${SLUG_ARG}` : LIMIT ? ` · limit=${LIMIT}` : '')
  )
  console.log(`   alias index: ${aliasIndex.size} keys · inci index: ${inciIndex.size} tokens\n`)

  await withAdminRls(async (tx) => {
    const { ingredientSlugToId } = await fetchIdMaps(tx)
    const eligible = await readEligible(tx)
    console.log(`   eligible products: ${eligible.length}\n`)

    let withLinks = 0
    let zeroLinks = 0
    let totalPairs = 0
    const slugFreq = new Map<string, number>()
    const unbridgedFreq = new Map<string, number>()
    const blockedFreq = new Map<string, number>()
    const zeroSamples: string[] = []
    let missingId = 0

    for (const product of eligible) {
      if (!product.inci) continue
      const { slugs, unbridged, blocked } = computeLinks(product.inci, product.category)
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
        if (zeroSamples.length < 20) zeroSamples.push(product.slug)
        continue
      }
      withLinks++
      totalPairs += pairs.length

      if (WRITE) {
        // --slug re-links: clear existing rows first so the run is a clean replace.
        if (SLUG_ARG) {
          await tx.delete(productIngredients).where(eq(productIngredients.productId, product.id))
        }
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
      zeroSamples,
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
