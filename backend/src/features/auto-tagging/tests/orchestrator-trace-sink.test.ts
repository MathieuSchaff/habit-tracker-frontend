// The orchestrator's optional trace sink. detectAllAutoTags owns the one
// dispatch loop; explainInci reads it through this sink instead of re-running the
// loop. This pins the sink contract (per-pass callback in registry order, a
// single pre-promote snapshot, drop-count wiring) so explain can rely on it.

import { describe, expect, it } from 'bun:test'

import type { ProductKind } from '@aurore/shared'

import { type AutoTagTraceSink, detectAllAutoTags } from '../orchestrator'
import { AUTO_TAG_PASSES } from '../passes/registry'

const SERUM_INCI = 'Aqua, Niacinamide, Glycerin, Pentylene Glycol, Zinc PCA, Phenoxyethanol'
const input = { inci: SERUM_INCI, kind: 'serum' as ProductKind, category: 'skincare' }

describe('detectAllAutoTags — trace sink', () => {
  it('calls onPass once per pass in registry order', () => {
    const passNames: string[] = []
    detectAllAutoTags(input, {}, { onPass: (name) => passNames.push(name) })
    expect(passNames).toEqual(AUTO_TAG_PASSES.map((p) => p.name))
  })

  it('calls onMerged exactly once with the pre-promote tag set (same slugs as final)', () => {
    let mergedCalls = 0
    let snapshotSlugs: string[] = []
    const final = detectAllAutoTags(input, {}, {
      onMerged: (byTag) => {
        mergedCalls++
        snapshotSlugs = [...byTag.keys()]
      },
    } satisfies AutoTagTraceSink)
    expect(mergedCalls).toBe(1)
    // primaryPromote never adds or removes slugs — only rewrites relevance — so
    // the pre-promote snapshot carries exactly the final slug set.
    expect(snapshotSlugs.sort()).toEqual(final.map((p) => p.tagSlug).sort())
  })

  it('populates the sink dropCounts via the algo-derm gate', () => {
    const dropCounts = new Map<string, number>()
    detectAllAutoTags(input, {}, { dropCounts })
    expect(dropCounts.size).toBeGreaterThan(0)
  })

  it('runs identically with no sink (backward compatible)', () => {
    const withSink = detectAllAutoTags(input, {}, { onPass: () => {} })
    const without = detectAllAutoTags(input)
    expect(withSink).toEqual(without)
  })
})
