// Unit coverage for the Pass interface foundation (ADR-0001).
//
// Targets `lib/pass-helpers.ts` (asProposals, priorSlugsBySource, priorSlugSet)
// and `lib/merge.ts` (mergeProposal, primaryPromote). Orchestrator integration
// stays under `auto-tag-orchestrator-parity.test.ts`.

import { describe, expect, test } from 'bun:test'

import {
  SKINCARE_PRODUCT_TAG_SLUGS as S,
  SKINCARE_CONCERN_SLUGS,
  type SkincareProductTagSlug,
} from '@aurore/shared'

import { CONCERN_PRIMARY_CONFIDENCE_FLOOR, mergeProposal, primaryPromote } from '../lib/merge'
import { asProposals, priorSlugSet, priorSlugsBySource } from '../lib/pass-helpers'
import type { AutoTagProposal } from '../lib/pass-types'

const proposal = (
  tagSlug: SkincareProductTagSlug,
  relevance: AutoTagProposal['relevance'],
  source: AutoTagProposal['source'],
  confidence?: number
): AutoTagProposal =>
  confidence === undefined
    ? { tagSlug, relevance, source }
    : { tagSlug, relevance, source, confidence }

describe('asProposals', () => {
  test('wraps slugs with given source + default secondary relevance', () => {
    const out = asProposals([S.TYPE_SERUM, S.ZONE_VISAGE], 'kind')
    expect(out).toEqual([
      { tagSlug: S.TYPE_SERUM, relevance: 'secondary', source: 'kind' },
      { tagSlug: S.ZONE_VISAGE, relevance: 'secondary', source: 'kind' },
    ])
  })

  test('honors explicit relevance', () => {
    const out = asProposals([S.RETINOIDS], 'cross-signal', 'avoid')
    expect(out).toEqual([{ tagSlug: S.RETINOIDS, relevance: 'avoid', source: 'cross-signal' }])
  })

  test('empty input → empty output', () => {
    expect(asProposals([], 'formula')).toEqual([])
  })
})

describe('priorSlugsBySource', () => {
  test('filters proposals by source, preserves order', () => {
    const prior: AutoTagProposal[] = [
      proposal(S.RETINOIDS, 'secondary', 'actif-class'),
      proposal(S.TYPE_SERUM, 'secondary', 'kind'),
      proposal(S.AHA, 'secondary', 'actif-class'),
    ]
    expect(priorSlugsBySource(prior, 'actif-class')).toEqual([S.RETINOIDS, S.AHA])
  })

  test('no matches → empty array', () => {
    const prior: AutoTagProposal[] = [proposal(S.TYPE_SERUM, 'secondary', 'kind')]
    expect(priorSlugsBySource(prior, 'algo-derm')).toEqual([])
  })
})

describe('priorSlugSet', () => {
  test('returns the deduped set of slugs', () => {
    const prior: AutoTagProposal[] = [
      proposal(S.PEAU_GRASSE, 'secondary', 'algo-derm'),
      proposal(S.TYPE_SERUM, 'secondary', 'kind'),
    ]
    const set = priorSlugSet(prior)
    expect(set.has(S.PEAU_GRASSE)).toBe(true)
    expect(set.has(S.TYPE_SERUM)).toBe(true)
    expect(set.has(S.PEAU_NORMALE)).toBe(false)
    expect(set.size).toBe(2)
  })
})

describe('mergeProposal — precedence', () => {
  test('inserts first proposal', () => {
    const byTag = new Map<SkincareProductTagSlug, AutoTagProposal>()
    mergeProposal(byTag, proposal(S.TYPE_SERUM, 'secondary', 'kind'))
    expect(byTag.get(S.TYPE_SERUM)).toEqual({
      tagSlug: S.TYPE_SERUM,
      relevance: 'secondary',
      source: 'kind',
    })
  })

  test('avoid wins over secondary, replacing source', () => {
    const byTag = new Map<SkincareProductTagSlug, AutoTagProposal>()
    mergeProposal(byTag, proposal(S.RETINOIDS, 'secondary', 'algo-derm'))
    mergeProposal(byTag, proposal(S.RETINOIDS, 'avoid', 'cross-signal'))
    expect(byTag.get(S.RETINOIDS)).toEqual({
      tagSlug: S.RETINOIDS,
      relevance: 'avoid',
      source: 'cross-signal',
    })
  })

  test('avoid wins over primary', () => {
    const byTag = new Map<SkincareProductTagSlug, AutoTagProposal>()
    mergeProposal(byTag, proposal(S.RETINOIDS, 'primary', 'algo-derm'))
    mergeProposal(byTag, proposal(S.RETINOIDS, 'avoid', 'interaction'))
    expect(byTag.get(S.RETINOIDS)?.relevance).toBe('avoid')
  })

  test('avoid stays when followed by secondary (no demotion)', () => {
    const byTag = new Map<SkincareProductTagSlug, AutoTagProposal>()
    mergeProposal(byTag, proposal(S.RETINOIDS, 'avoid', 'cross-signal'))
    mergeProposal(byTag, proposal(S.RETINOIDS, 'secondary', 'algo-derm'))
    expect(byTag.get(S.RETINOIDS)).toEqual({
      tagSlug: S.RETINOIDS,
      relevance: 'avoid',
      source: 'cross-signal',
    })
  })

  test('avoid stays when followed by primary (no demotion)', () => {
    const byTag = new Map<SkincareProductTagSlug, AutoTagProposal>()
    mergeProposal(byTag, proposal(S.RETINOIDS, 'avoid', 'cross-signal'))
    mergeProposal(byTag, proposal(S.RETINOIDS, 'primary', 'kind'))
    expect(byTag.get(S.RETINOIDS)?.relevance).toBe('avoid')
  })

  test('equal relevance keeps first seen (source preserved)', () => {
    const byTag = new Map<SkincareProductTagSlug, AutoTagProposal>()
    mergeProposal(byTag, proposal(S.RETINOIDS, 'secondary', 'algo-derm'))
    mergeProposal(byTag, proposal(S.RETINOIDS, 'secondary', 'actif-class'))
    expect(byTag.get(S.RETINOIDS)?.source).toBe('algo-derm')
  })

  test('preserves confidence on overwrite when carried by the higher proposal', () => {
    const byTag = new Map<SkincareProductTagSlug, AutoTagProposal>()
    mergeProposal(byTag, proposal(S.HYPERPIGMENTATION, 'secondary', 'algo-derm', 0.6))
    mergeProposal(byTag, proposal(S.HYPERPIGMENTATION, 'avoid', 'interaction'))
    expect(byTag.get(S.HYPERPIGMENTATION)?.confidence).toBeUndefined()
  })
})

describe('primaryPromote — kind-derived TYPE_*', () => {
  test('promotes a secondary type slug to primary, preserving source', () => {
    const byTag = new Map<SkincareProductTagSlug, AutoTagProposal>()
    byTag.set(S.TYPE_SERUM, proposal(S.TYPE_SERUM, 'secondary', 'kind'))
    primaryPromote(byTag, 'serum')
    expect(byTag.get(S.TYPE_SERUM)).toEqual({
      tagSlug: S.TYPE_SERUM,
      relevance: 'primary',
      source: 'kind',
    })
  })

  test('does not demote an avoid signal on the same slug', () => {
    const byTag = new Map<SkincareProductTagSlug, AutoTagProposal>()
    byTag.set(S.TYPE_SERUM, proposal(S.TYPE_SERUM, 'avoid', 'cross-signal'))
    primaryPromote(byTag, 'serum')
    expect(byTag.get(S.TYPE_SERUM)?.relevance).toBe('avoid')
  })

  test('no-op when the kind type slug is not in the accumulator', () => {
    const byTag = new Map<SkincareProductTagSlug, AutoTagProposal>()
    primaryPromote(byTag, 'serum')
    expect(byTag.size).toBe(0)
  })
})

describe('primaryPromote — top algo-derm concern', () => {
  // Concrete concern slugs from SKINCARE_CONCERN_SLUGS (kept literal so the
  // test fails loudly if either slug ever leaves the concern taxonomy).
  const concernA: SkincareProductTagSlug = S.ACNE_IMPERFECTIONS
  const concernB: SkincareProductTagSlug = S.HYPERPIGMENTATION

  test('chosen fixture slugs remain in SKINCARE_CONCERN_SLUGS', () => {
    expect(SKINCARE_CONCERN_SLUGS.has(concernA)).toBe(true)
    expect(SKINCARE_CONCERN_SLUGS.has(concernB)).toBe(true)
  })

  test('promotes the highest-confidence algo-derm concern above the floor', () => {
    const byTag = new Map<SkincareProductTagSlug, AutoTagProposal>()
    byTag.set(concernA, proposal(concernA, 'secondary', 'algo-derm', 0.72))
    byTag.set(concernB, proposal(concernB, 'secondary', 'algo-derm', 0.91))
    byTag.set(S.TYPE_SERUM, proposal(S.TYPE_SERUM, 'secondary', 'kind'))
    primaryPromote(byTag, 'serum')
    expect(byTag.get(concernB)?.relevance).toBe('primary')
    expect(byTag.get(concernA)?.relevance).toBe('secondary')
  })

  test('does not promote a concern below the confidence floor', () => {
    const byTag = new Map<SkincareProductTagSlug, AutoTagProposal>()
    byTag.set(
      concernA,
      proposal(concernA, 'secondary', 'algo-derm', CONCERN_PRIMARY_CONFIDENCE_FLOOR - 0.01)
    )
    primaryPromote(byTag, 'serum')
    expect(byTag.get(concernA)?.relevance).toBe('secondary')
  })

  test('promotes exactly at the floor', () => {
    const byTag = new Map<SkincareProductTagSlug, AutoTagProposal>()
    byTag.set(
      concernA,
      proposal(concernA, 'secondary', 'algo-derm', CONCERN_PRIMARY_CONFIDENCE_FLOOR)
    )
    primaryPromote(byTag, 'serum')
    expect(byTag.get(concernA)?.relevance).toBe('primary')
  })

  test('ignores concerns sourced from non-algo-derm passes', () => {
    const byTag = new Map<SkincareProductTagSlug, AutoTagProposal>()
    byTag.set(concernA, proposal(concernA, 'secondary', 'cross-signal', 0.95))
    primaryPromote(byTag, 'serum')
    expect(byTag.get(concernA)?.relevance).toBe('secondary')
  })

  test('ignores algo-derm proposals already at avoid', () => {
    const byTag = new Map<SkincareProductTagSlug, AutoTagProposal>()
    byTag.set(concernA, proposal(concernA, 'avoid', 'algo-derm', 0.95))
    primaryPromote(byTag, 'serum')
    expect(byTag.get(concernA)?.relevance).toBe('avoid')
  })

  test('treats undefined confidence as zero', () => {
    const byTag = new Map<SkincareProductTagSlug, AutoTagProposal>()
    byTag.set(concernA, proposal(concernA, 'secondary', 'algo-derm'))
    primaryPromote(byTag, 'serum')
    expect(byTag.get(concernA)?.relevance).toBe('secondary')
  })
})
