// Shared persist-filter seam. The three persisting auto-tag consumers
// (writeTagsForProduct intake, the backfill runner, reconcile dry-run) each ran
// an identical "withhold eczema-atopie, resolve slug→tagId, drop
// domain-ineligible tag types" sequence after detectAllAutoTags. Extracted so
// they cannot drift on which orchestrator emissions reach the DB; each caller
// projects the result to its own row shape.
//
// DB-free and orchestrator-free on purpose: input building (percentClaims,
// knownConcentrations) and the detectAllAutoTags call stay at each caller, which
// is where they legitimately diverge. seed-core is intentionally NOT a consumer:
// it persists by slug, skips the domain filter, and flattens relevance — a
// different kernel, not this one.

import {
  DOMAIN_PRODUCT_FILTER_CATEGORIES,
  PRODUCT_CATEGORY_TO_DOMAIN_TAB,
  type ProductCategory,
} from '@aurore/shared'

import { partitionEczemaReview } from '../passes/formula'
import type { AutoTagPair, AutoTagRelevance, AutoTagSource } from './pass-types'

export interface ResolvedTagRow {
  tagSlug: AutoTagPair['tagSlug']
  tagId: string
  relevance: AutoTagRelevance
  source: AutoTagSource
}

export function resolveTagRows(
  pairs: readonly AutoTagPair[],
  product: { category: ProductCategory; description: string | null | undefined },
  tagSlugToInfo: ReadonlyMap<string, { id: string; tagType: string }>
): { rows: ResolvedTagRow[]; withheld: boolean } {
  const domainTab = PRODUCT_CATEGORY_TO_DOMAIN_TAB[product.category]
  const validTagTypes = domainTab
    ? (DOMAIN_PRODUCT_FILTER_CATEGORIES[domainTab] as readonly string[])
    : []

  const { kept, withheld } = partitionEczemaReview(pairs, product.description)
  const rows: ResolvedTagRow[] = []
  for (const pair of kept) {
    const info = tagSlugToInfo.get(pair.tagSlug)
    if (!info || !validTagTypes.includes(info.tagType)) continue
    rows.push({
      tagSlug: pair.tagSlug,
      tagId: info.id,
      relevance: pair.relevance,
      source: pair.source,
    })
  }
  return { rows, withheld }
}
