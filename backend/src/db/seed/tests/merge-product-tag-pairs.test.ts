import { describe, expect, it } from 'bun:test'

import { mergeProductTagPairs, type SeedProductTagPair } from '../seeders/merge-product-tag-pairs'

const pair = (
  slug: string,
  tagSlug: string,
  relevance: SeedProductTagPair['relevance'],
  source: string
): SeedProductTagPair => ({ slug, tagSlug, relevance, source })

describe('mergeProductTagPairs', () => {
  it('concatène les flux disjoints dans l’ordre manual, avoid, auto', () => {
    const { pairs, conflicts, dupes } = mergeProductTagPairs({
      manual: [pair('p1', 'peau-seche', 'secondary', 'manual')],
      avoid: [pair('p2', 'peau-sensible', 'avoid', 'cross-signal')],
      auto: [pair('p3', 'apaisant', 'secondary', 'formula')],
    })
    expect(pairs.map((p) => p.slug)).toEqual(['p1', 'p2', 'p3'])
    expect(conflicts).toEqual([])
    expect(dupes).toBe(0)
  })

  it('manual gagne sur un avoid divergent et le conflit est rapporté', () => {
    const { pairs, conflicts, dupes } = mergeProductTagPairs({
      manual: [pair('p1', 'peau-sensible', 'secondary', 'manual')],
      avoid: [pair('p1', 'peau-sensible', 'avoid', 'cross-signal')],
      auto: [],
    })
    expect(pairs).toEqual([pair('p1', 'peau-sensible', 'secondary', 'manual')])
    expect(conflicts).toEqual([
      {
        slug: 'p1',
        tagSlug: 'peau-sensible',
        manualRelevance: 'secondary',
        avoidSource: 'cross-signal',
      },
    ])
    expect(dupes).toBe(0)
  })

  it('un avoid manuel absorbe l’avoid auto sans conflit (verdicts alignés)', () => {
    const { pairs, conflicts, dupes } = mergeProductTagPairs({
      manual: [pair('p1', 'peau-sensible', 'avoid', 'manual')],
      avoid: [pair('p1', 'peau-sensible', 'avoid', 'interaction')],
      auto: [],
    })
    expect(pairs).toEqual([pair('p1', 'peau-sensible', 'avoid', 'manual')])
    expect(conflicts).toEqual([])
    expect(dupes).toBe(1)
  })

  it('manual gagne silencieusement sur un secondary auto redondant', () => {
    const { pairs, conflicts, dupes } = mergeProductTagPairs({
      manual: [pair('p1', 'apaisant', 'secondary', 'manual')],
      avoid: [],
      auto: [pair('p1', 'apaisant', 'secondary', 'formula')],
    })
    expect(pairs).toEqual([pair('p1', 'apaisant', 'secondary', 'manual')])
    expect(conflicts).toEqual([])
    expect(dupes).toBe(1)
  })

  it('fusionne les doublons internes du flux manual en gardant le premier', () => {
    const { pairs, conflicts, dupes } = mergeProductTagPairs({
      manual: [
        pair('p1', 'apaisant', 'primary', 'manual'),
        pair('p1', 'apaisant', 'secondary', 'manual'),
      ],
      avoid: [],
      auto: [],
    })
    expect(pairs).toEqual([pair('p1', 'apaisant', 'primary', 'manual')])
    expect(conflicts).toEqual([])
    expect(dupes).toBe(1)
  })

  it('avoid gagne sur un secondary auto de même clé (défense, impossible par construction)', () => {
    const { pairs, conflicts, dupes } = mergeProductTagPairs({
      manual: [],
      avoid: [pair('p1', 'peau-sensible', 'avoid', 'cross-signal')],
      auto: [pair('p1', 'peau-sensible', 'secondary', 'formula')],
    })
    expect(pairs).toEqual([pair('p1', 'peau-sensible', 'avoid', 'cross-signal')])
    expect(conflicts).toEqual([])
    expect(dupes).toBe(1)
  })
})
