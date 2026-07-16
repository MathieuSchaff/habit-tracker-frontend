import { describe, expect, it } from 'vitest'

import { compareConcentrationReads, formatConcentrationRead, readConcentration } from './estimate'

const base = { meanPct: 5, ciLowPct: 4, ciHighPct: 6 }

describe('readConcentration', () => {
  it('returns the declared value when a brand claim exists', () => {
    expect(readConcentration({ ...base, claimPct: 15 })).toEqual({ kind: 'declared', value: 15 })
  })

  it('prefers the solver interval over the raw prior', () => {
    const r = readConcentration({
      meanPct: 3,
      ciLowPct: 0.3,
      ciHighPct: 9,
      solverMeanPct: 10,
      solverCiLowPct: 8,
      solverCiHighPct: 12,
    })
    expect(r).toEqual({ kind: 'band', lo: 8, hi: 12, mean: 10 })
  })

  it('degrades a too-wide prior to unestimable', () => {
    expect(readConcentration({ meanPct: 2, ciLowPct: 0.3, ciHighPct: 8 })).toEqual({
      kind: 'unestimable',
    })
  })

  it('degrades when the solver is missing, even with a tight prior', () => {
    expect(readConcentration({ meanPct: 10, ciLowPct: 8, ciHighPct: 12 })).toEqual({
      kind: 'unestimable',
    })
  })

  it('degrades when solver bounds collapse after rounding', () => {
    expect(
      readConcentration({
        ...base,
        solverMeanPct: 10,
        solverCiLowPct: 9.6,
        solverCiHighPct: 10.4,
      })
    ).toEqual({ kind: 'unestimable' })
  })

  it('unestimable on absurd data', () => {
    expect(readConcentration({ meanPct: 0, ciLowPct: 0, ciHighPct: 0 })).toEqual({
      kind: 'unestimable',
    })
  })
})

describe('formatConcentrationRead', () => {
  it('formats a declared value', () => {
    expect(formatConcentrationRead({ kind: 'declared', value: 15 })).toBe('15 % (déclaré)')
  })

  it('formats a band', () => {
    expect(formatConcentrationRead({ kind: 'band', lo: 8, hi: 12, mean: 10 })).toBe('~8–12 %')
  })

  it('rejects a band that collapses to a single value', () => {
    expect(formatConcentrationRead({ kind: 'band', lo: 10, hi: 10, mean: 10 })).toBeNull()
  })

  it('rounds to one decimal below 1 %', () => {
    expect(formatConcentrationRead({ kind: 'band', lo: 0.12, hi: 0.48, mean: 0.3 })).toBe(
      '~0,1–0,5 %'
    )
  })

  it('formats nothing for an unestimable read', () => {
    expect(formatConcentrationRead({ kind: 'unestimable' })).toBeNull()
  })
})

describe('compareConcentrationReads', () => {
  it('orders declared before bands and qualitative lines', () => {
    const declared = { kind: 'declared', value: 15 } as const
    const band = { kind: 'band', lo: 8, hi: 12, mean: 10 } as const
    const unestimable = { kind: 'unestimable' } as const

    expect(compareConcentrationReads(declared, band)).toBeLessThan(0)
    expect(compareConcentrationReads(band, unestimable)).toBeLessThan(0)
  })

  it('prefers the narrower relative band', () => {
    const wide = { kind: 'band', lo: 6, hi: 14, mean: 10 } as const
    const narrow = { kind: 'band', lo: 9, hi: 11, mean: 10 } as const

    expect(compareConcentrationReads(narrow, wide)).toBeLessThan(0)
  })

  it('measures relative width against the solver mean', () => {
    const lowerRelativeWidth = { kind: 'band', lo: 1, hi: 3, mean: 3 } as const
    const higherRelativeWidth = { kind: 'band', lo: 4, hi: 8, mean: 4 } as const

    expect(compareConcentrationReads(lowerRelativeWidth, higherRelativeWidth)).toBeLessThan(0)
  })
})
