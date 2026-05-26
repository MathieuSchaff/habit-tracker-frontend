// Pure test (no DB): the backfill classifier must never route a candidate whose
// PK is held by a source='manual' row to toUpsert — upsertExistingPairs rewrites
// relevance+source unconditionally, so it would clobber human curation. Aligns
// main.ts backfill with writeTagsForProduct's "never touch manual" invariant.

import { describe, expect, it } from 'bun:test'

import { type Candidate, classifyCandidates, type Relevance } from '../runners/backfill/classify'

function cand(productTagId: string, relevance: Relevance): Candidate {
  return {
    productId: 'p1',
    productTagId,
    slug: 'prod',
    tagSlug: `tag-${productTagId}`,
    relevance,
    source: 'formula',
  }
}
const pk = (tid: string) => `p1:${tid}`

describe('classifyCandidates — manual-row guard', () => {
  it('does not upsert a primary candidate when a manual secondary holds the PK', () => {
    const r = classifyCandidates(
      new Map([[pk('t1'), cand('t1', 'primary')]]),
      new Map<string, Relevance>([[pk('t1'), 'secondary']]),
      new Set(), // no curated primary → candidate stays primary (gate would otherwise demote)
      new Set([pk('t1')]) // manual holds the PK
    )
    expect(r.toUpsert).toHaveLength(0)
    expect(r.primaryUpserts).toBe(0)
    expect(r.skipped).toBe(1)
  })

  it('does not upsert an avoid candidate when a manual non-avoid row holds the PK', () => {
    const r = classifyCandidates(
      new Map([[pk('t1'), cand('t1', 'avoid')]]),
      new Map<string, Relevance>([[pk('t1'), 'secondary']]),
      new Set(),
      new Set([pk('t1')])
    )
    expect(r.toUpsert).toHaveLength(0)
    expect(r.skipped).toBe(1)
  })

  it('still upserts a NON-manual secondary to primary (guard does not over-block)', () => {
    const r = classifyCandidates(
      new Map([[pk('t1'), cand('t1', 'primary')]]),
      new Map<string, Relevance>([[pk('t1'), 'secondary']]),
      new Set(),
      new Set() // not manual
    )
    expect(r.toUpsert).toHaveLength(1)
    expect(r.primaryUpserts).toBe(1)
  })

  it('still inserts a brand-new candidate (manual set is irrelevant when no PK exists)', () => {
    const r = classifyCandidates(
      new Map([[pk('t1'), cand('t1', 'secondary')]]),
      new Map<string, Relevance>(),
      new Set(),
      new Set()
    )
    expect(r.toInsert).toHaveLength(1)
    expect(r.skipped).toBe(0)
  })
})
