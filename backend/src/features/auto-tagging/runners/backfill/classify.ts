// Pure classification core for the backfill runner (no DB / no env imports, so
// it unit-tests without a database). main.ts feeds it the loaded maps.

import type { AutoTagSource } from '../../orchestrator'

export type Relevance = 'primary' | 'secondary' | 'avoid'

export interface Candidate {
  productId: string
  productTagId: string
  slug: string
  tagSlug: string
  relevance: Relevance
  source: AutoTagSource
}

export interface ClassifyResult {
  toInsert: Candidate[]
  toUpsert: Candidate[]
  skipped: number
  primaryInserts: number
  primaryUpserts: number
}

// V1/V2 gate: V1 backfill inserts product_type_v2 primaries when curation is
// absent; re-running the gate on "any primary row" would block V2 (concern)
// from firing on products V1 already touched, so the caller treats only the
// V1-emittable tagType as "auto" when building productsWithCuratedPrimary.
// Demote to secondary for curated products so the row is still inserted.
export function applyV1V2Gate(c: Candidate, productsWithCuratedPrimary: Set<string>): Candidate {
  const promoteAllowed = c.relevance === 'primary' && !productsWithCuratedPrimary.has(c.productId)
  if (c.relevance === 'primary' && !promoteAllowed) {
    return { ...c, relevance: 'secondary' }
  }
  return c
}

export function classifyCandidates(
  candidateMap: Map<string, Candidate>,
  existingMap: Map<string, Relevance>,
  productsWithCuratedPrimary: Set<string>,
  manualPairs: Set<string>
): ClassifyResult {
  const toInsert: Candidate[] = []
  const toUpsert: Candidate[] = []
  let skipped = 0
  let primaryInserts = 0
  let primaryUpserts = 0

  for (const c of candidateMap.values()) {
    const effective = applyV1V2Gate(c, productsWithCuratedPrimary)
    const pairKey = `${effective.productId}:${effective.productTagId}`
    const dbRel = existingMap.get(pairKey)
    // A manual row owns this PK → never upsert it. upsertExistingPairs rewrites
    // relevance+source unconditionally, so an avoid/primary candidate would
    // clobber human curation. writeTagsForProduct already scopes its DELETE to
    // non-manual; backfill must honour the same invariant.
    const isManual = manualPairs.has(pairKey)

    if (dbRel === undefined) {
      toInsert.push(effective)
      if (effective.relevance === 'primary') primaryInserts++
    } else if (!isManual && effective.relevance === 'avoid' && dbRel !== 'avoid') {
      toUpsert.push(effective)
    } else if (!isManual && effective.relevance === 'primary' && dbRel === 'secondary') {
      // Kind-derived primary inserted as secondary by an earlier backfill; gate confirmed no curated primary exists.
      toUpsert.push(effective)
      primaryUpserts++
    } else {
      skipped++
    }
  }
  return { toInsert, toUpsert, skipped, primaryInserts, primaryUpserts }
}
