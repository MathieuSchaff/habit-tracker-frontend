import { describe, expect, it } from 'bun:test'

import { detectKindTags, type ProductKind, type SkincareProductTagSlug } from '@aurore/shared'

import { explainInci } from '../explain'
import type { AutoTagRelevance, AutoTagSource } from '../lib/pass-types'
import { detectAllAutoTags } from '../orchestrator'

const SERUM_INCI = 'Aqua, Niacinamide, Glycerin, Pentylene Glycol, Zinc PCA, Phenoxyethanol'

describe('explainInci', () => {
  it('traces layers + drops and stays faithful to the orchestrator', () => {
    const input = { inci: SERUM_INCI, kind: 'serum' as ProductKind, category: 'skincare' }
    const trace = explainInci(input)

    expect(trace.eligible).toBe(true)

    // The trace is a faithful replay of the orchestrator, not a fork: its
    // final set must equal detectAllAutoTags. This is the drift guard — no
    // snapshot needed, both move together when algo-derm changes.
    expect(trace.final).toEqual(detectAllAutoTags(input))

    // Kind layer is pure shared logic (deterministic) — safe to anchor on.
    const kindLayer = trace.layers.find((l) => l.name === 'kind')
    expect(kindLayer).toBeDefined()
    expect(kindLayer?.proposals.map((p) => p.tagSlug).sort()).toEqual(
      [...detectKindTags('serum')].sort()
    )

    // algo-derm gates ~38 candidates; for any real INCI most are absent, so a
    // not_present drop is effectively guaranteed.
    expect(trace.drops.some((d) => d.reason === 'not_present')).toBe(true)

    // Every recorded proposal carries a merge outcome; superseded ones name
    // the winner that holds the tag instead.
    for (const layer of trace.layers) {
      for (const p of layer.proposals) {
        expect(['won', 'superseded']).toContain(p.outcome)
        if (p.outcome === 'superseded') expect(p.supersededBy).toBeDefined()
      }
    }

    // Trajectory guard, not just endpoint: the layer bookkeeping must reconcile
    // with the final set. A dispatch-loop drift (e.g. a mis-placed `prior`
    // snapshot) can leave `final` equal while corrupting won/superseded; these
    // invariants catch that. Structural only, so no algo-derm value coupling.
    const finalBySlug = new Map(trace.final.map((p) => [p.tagSlug, p]))
    const promotedFrom = new Map(trace.promotions.map((p) => [p.tagSlug, p.from]))
    const wonBySlug = new Map<
      SkincareProductTagSlug,
      { relevance: AutoTagRelevance; source: AutoTagSource }
    >()
    for (const layer of trace.layers) {
      for (const p of layer.proposals) {
        if (p.outcome !== 'won') continue
        expect(wonBySlug.has(p.tagSlug)).toBe(false) // one winner per slug
        wonBySlug.set(p.tagSlug, { relevance: p.relevance, source: p.source })
      }
    }
    // Each final tag was won by exactly one layer; each winner is in final.
    expect([...wonBySlug.keys()].sort()).toEqual([...finalBySlug.keys()].sort())
    for (const [slug, won] of wonBySlug) {
      const fin = finalBySlug.get(slug)
      // Source is never rewritten downstream; relevance only via primaryPromote.
      expect(fin?.source).toBe(won.source)
      if (fin && fin.relevance !== won.relevance) {
        expect(fin.relevance).toBe('primary')
        expect(promotedFrom.get(slug)).toBe(won.relevance)
      }
    }
    // A superseded proposal must point at its slug's actual winner.
    for (const layer of trace.layers) {
      for (const p of layer.proposals) {
        if (p.outcome !== 'superseded') continue
        expect(p.supersededBy).toEqual(wonBySlug.get(p.tagSlug))
      }
    }
  })

  it('does not crash on empty INCI and still emits kind tags', () => {
    const input = { inci: '', kind: 'serum' as ProductKind, category: 'skincare' }
    const trace = explainInci(input)

    expect(trace.eligible).toBe(true)
    expect(trace.final).toEqual(detectAllAutoTags(input))
    // algo-derm abstains without INCI; kind still fires.
    expect(trace.layers.find((l) => l.name === 'algo-derm')).toBeUndefined()
    expect(trace.layers.find((l) => l.name === 'kind')).toBeDefined()
  })

  it('returns an empty trace for ineligible categories', () => {
    const input = { inci: SERUM_INCI, kind: 'shampoo' as ProductKind, category: 'haircare' }
    const trace = explainInci(input)

    expect(trace.eligible).toBe(false)
    expect(trace.layers).toEqual([])
    expect(trace.final).toEqual([])
    expect(trace.final).toEqual(detectAllAutoTags(input))
  })
})
