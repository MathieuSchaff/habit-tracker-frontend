import { describe, expect, it } from 'vitest'

import { deriveKpChips, type KpChipTag } from '../kp-chips'

const KP = new Set(['keratose-pilaire'])

function tag(tagSlug: string, relevance: KpChipTag['relevance'] = 'secondary'): KpChipTag {
  return { tagSlug, relevance }
}

describe('deriveKpChips', () => {
  it('returns no chips when the profile has not declared KP', () => {
    const out = deriveKpChips({
      profileSlugs: new Set(['anti-age', 'peau-seche']),
      tags: [tag('urea'), tag('apaisant')],
      inci: 'aqua, niacinamide',
    })
    expect(out).toEqual({ bumps: false, red: false })
  })

  it('bumps fires on any keratolytic actif-class tag', () => {
    for (const slug of ['urea', 'aha', 'bha']) {
      expect(deriveKpChips({ profileSlugs: KP, tags: [tag(slug)], inci: null }).bumps).toBe(true)
    }
  })

  it('red fires on niacinamide in INCI (no tag needed), case-insensitive', () => {
    expect(
      deriveKpChips({
        profileSlugs: KP,
        tags: [],
        inci: 'Aqua, Glycerin, NIACINAMIDE, Phenoxyethanol',
      }).red
    ).toBe(true)
  })

  it('red fires on apaisant or rougeurs-vasculaires tags', () => {
    expect(deriveKpChips({ profileSlugs: KP, tags: [tag('apaisant')], inci: null }).red).toBe(true)
    expect(
      deriveKpChips({ profileSlugs: KP, tags: [tag('rougeurs-vasculaires')], inci: null }).red
    ).toBe(true)
  })

  it('excludes avoid-relevance tags (warning, not a help signal)', () => {
    const out = deriveKpChips({
      profileSlugs: KP,
      tags: [tag('aha', 'avoid'), tag('rougeurs-vasculaires', 'avoid')],
      inci: 'aqua, glycerin',
    })
    expect(out).toEqual({ bumps: false, red: false })
  })

  it('handles null INCI and emits nothing without signals', () => {
    expect(deriveKpChips({ profileSlugs: KP, tags: [], inci: null })).toEqual({
      bumps: false,
      red: false,
    })
  })

  it('both axes can fire together', () => {
    const out = deriveKpChips({
      profileSlugs: KP,
      tags: [tag('urea'), tag('apaisant')],
      inci: 'aqua',
    })
    expect(out).toEqual({ bumps: true, red: true })
  })
})
