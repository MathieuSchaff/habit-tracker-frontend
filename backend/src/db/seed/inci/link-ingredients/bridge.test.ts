import { describe, expect, it } from 'bun:test'

import type { InciIndex } from '../index'
import { bridgeEvidenceToSlug, buildSlugByHumanized } from './bridge'

const inciIndex: InciIndex = new Map([
  ['NIACINAMIDE', { slug: 'niacinamide' }],
  ['CENTELLA ASIATICA EXTRACT', { slug: 'centella-asiatica' }],
])

const slugByHumanized = buildSlugByHumanized(['niacinamide', 'vitamin-c', 'centella-asiatica'])

describe('bridgeEvidenceToSlug', () => {
  it('B2: maps canonical inci to slug via the inci index', () => {
    expect(bridgeEvidenceToSlug({ inci: 'Niacinamide' }, inciIndex, slugByHumanized)).toBe(
      'niacinamide'
    )
  })

  it('B2: resolves through an alias when the primary inci misses the index', () => {
    const ev = { inci: 'Ascorbic Acid', aliases: ['Centella Asiatica Extract'] }
    expect(bridgeEvidenceToSlug(ev, inciIndex, slugByHumanized)).toBe('centella-asiatica')
  })

  it('B1: falls back to humanised-slug equality when the index has no token', () => {
    // 'vitamin-c' is not in the inci index, only reachable via the humanised map.
    expect(bridgeEvidenceToSlug({ inci: 'Vitamin C' }, inciIndex, slugByHumanized)).toBe(
      'vitamin-c'
    )
  })

  it('returns null when evidence maps to no aurore slug', () => {
    expect(bridgeEvidenceToSlug({ inci: 'Unobtanium Extract' }, inciIndex, slugByHumanized)).toBe(
      null
    )
  })
})

describe('buildSlugByHumanized', () => {
  it('keys the normalised humanised form and keeps the first slug on collision', () => {
    const map = buildSlugByHumanized(['vitamin-c', 'vitamin-c-duplicate'])
    expect(map.get('vitamin c')).toBe('vitamin-c')
  })
})
