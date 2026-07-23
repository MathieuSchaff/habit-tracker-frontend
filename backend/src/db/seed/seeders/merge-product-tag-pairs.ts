// Merge the seed's product-tag pair streams under the global manual-safety
// invariant: curated pairs are never silently replaced by an auto verdict
// (write.ts scopes its DELETE to source != 'manual'; backfill classify.ts
// guards with !isManual). An auto `avoid` colliding with a manual pair of a
// different verdict is dropped and reported for human arbitration.
// Pure module (no DB / no env imports) so it unit-tests without a database.

// Type alias, not interface: the alias keeps an implicit index signature so
// merged pairs still satisfy pruneRelationshipPairs' Record<string, unknown> bound.
export type SeedProductTagPair = {
  slug: string
  tagSlug: string
  relevance: 'primary' | 'secondary' | 'avoid'
  source: string
}

export interface AvoidManualConflict {
  slug: string
  tagSlug: string
  manualRelevance: SeedProductTagPair['relevance']
  avoidSource: string
}

export interface MergeProductTagPairsResult {
  pairs: SeedProductTagPair[]
  conflicts: AvoidManualConflict[]
  // Silent same-key merges (redundant emissions, internal manual dupes);
  // conflicts are counted separately, never here.
  dupes: number
}

const keyOf = (pair: Pick<SeedProductTagPair, 'slug' | 'tagSlug'>): string =>
  `${pair.slug}::${pair.tagSlug}`

export function mergeProductTagPairs(streams: {
  manual: SeedProductTagPair[]
  avoid: SeedProductTagPair[]
  auto: SeedProductTagPair[]
}): MergeProductTagPairsResult {
  const byKey = new Map<string, SeedProductTagPair>()
  const manualKeys = new Set<string>()
  const conflicts: AvoidManualConflict[] = []
  let dupes = 0

  for (const pair of streams.manual) {
    const key = keyOf(pair)
    if (byKey.has(key)) {
      dupes++
      continue
    }
    byKey.set(key, pair)
    manualKeys.add(key)
  }

  for (const pair of streams.avoid) {
    const key = keyOf(pair)
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, pair)
      continue
    }
    // Diverging verdict on a curated pair is the only case worth surfacing;
    // a manual `avoid` already carries the same signal.
    if (manualKeys.has(key) && existing.relevance !== 'avoid') {
      conflicts.push({
        slug: pair.slug,
        tagSlug: pair.tagSlug,
        manualRelevance: existing.relevance,
        avoidSource: pair.source,
      })
    } else {
      dupes++
    }
  }

  for (const pair of streams.auto) {
    const key = keyOf(pair)
    if (byKey.has(key)) {
      dupes++
      continue
    }
    byKey.set(key, pair)
  }

  return { pairs: [...byKey.values()], conflicts, dupes }
}
