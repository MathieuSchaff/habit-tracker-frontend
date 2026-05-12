import { describe, expect, test } from 'bun:test'

import { computeDiff, type Row } from '../runners/audit/orchestrator-diff'

const row = (
  productSlug: string,
  tagSlug: string,
  relevance: 'secondary' | 'avoid' = 'secondary',
  source: Row['source'] = 'algo-derm'
): Row => ({
  productSlug,
  kind: 'serum',
  category: 'skincare',
  tagSlug,
  relevance,
  source,
})

describe('computeDiff', () => {
  test('identical sets → empty diff', () => {
    const set: Row[] = [row('p1', 't1'), row('p1', 't2'), row('p2', 't1')]
    expect(computeDiff(set, set)).toEqual([])
  })

  test('empty baseline → every current row reported as added', () => {
    const current: Row[] = [row('p1', 't1'), row('p1', 't2')]
    const diff = computeDiff([], current)
    expect(diff.length).toBe(2)
    for (const d of diff) {
      expect(d.action).toBe('added')
      expect(d.relevanceBefore).toBe('')
      expect(d.relevanceAfter).toBe('secondary')
    }
  })

  test('empty current → every baseline row reported as removed', () => {
    const baseline: Row[] = [row('p1', 't1'), row('p1', 't2')]
    const diff = computeDiff(baseline, [])
    expect(diff.length).toBe(2)
    for (const d of diff) {
      expect(d.action).toBe('removed')
      expect(d.relevanceBefore).toBe('secondary')
      expect(d.relevanceAfter).toBe('')
    }
  })

  test('relevance change → relevance_changed (not added+removed)', () => {
    const baseline: Row[] = [row('p1', 't1', 'secondary')]
    const current: Row[] = [row('p1', 't1', 'avoid')]
    const diff = computeDiff(baseline, current)
    expect(diff.length).toBe(1)
    expect(diff[0]?.action).toBe('relevance_changed')
    expect(diff[0]?.relevanceBefore).toBe('secondary')
    expect(diff[0]?.relevanceAfter).toBe('avoid')
  })

  test('source change only (same relevance) → ignored', () => {
    // Re-attribution between detectors (e.g. orchestrator pass dedup
    // reshuffle) is not observable on the (product, tag, relevance) axis.
    // Keep the diff focused on outcomes that affect UI / safety.
    const baseline: Row[] = [row('p1', 't1', 'secondary', 'algo-derm')]
    const current: Row[] = [row('p1', 't1', 'secondary', 'formula')]
    expect(computeDiff(baseline, current)).toEqual([])
  })

  test('mixed scenario: add + remove + change in one diff', () => {
    const baseline: Row[] = [
      row('p1', 't1', 'secondary'),
      row('p1', 't2', 'secondary'), // will be removed
      row('p2', 't1', 'secondary'), // will become avoid
    ]
    const current: Row[] = [
      row('p1', 't1', 'secondary'), // unchanged
      row('p2', 't1', 'avoid'), // relevance changed
      row('p3', 't1', 'secondary'), // added
    ]
    const diff = computeDiff(baseline, current)
    expect(diff.length).toBe(3)

    const byAction = new Map(diff.map((d) => [d.action, d]))
    expect(byAction.get('added')?.productSlug).toBe('p3')
    expect(byAction.get('removed')?.tagSlug).toBe('t2')
    expect(byAction.get('relevance_changed')?.productSlug).toBe('p2')
  })

  test('output is stably ordered (action, tag_slug, product_slug)', () => {
    const baseline: Row[] = [row('zz', 't9', 'secondary')] // removed
    const current: Row[] = [
      row('aa', 't1', 'secondary'), // added
      row('bb', 't1', 'secondary'), // added
    ]
    const diff = computeDiff(baseline, current)
    // added comes before removed; within added, t1 sorts before whatever; aa before bb.
    expect(diff.map((d) => `${d.action}:${d.tagSlug}:${d.productSlug}`)).toEqual([
      'added:t1:aa',
      'added:t1:bb',
      'removed:t9:zz',
    ])
  })
})
