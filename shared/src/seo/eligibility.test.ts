import { describe, expect, it } from 'bun:test'

import { evaluateSeoEligibility } from './eligibility'

describe('evaluateSeoEligibility', () => {
  it('indexes a visible topical product with an INCI formula', () => {
    expect(
      evaluateSeoEligibility({
        kind: 'product',
        moderationStatus: 'visible',
        category: 'skincare',
        hasInci: true,
      })
    ).toEqual({ indexable: true, reason: 'eligible' })
  })

  it('excludes a product without an INCI formula with an auditable reason', () => {
    expect(
      evaluateSeoEligibility({
        kind: 'product',
        moderationStatus: 'visible',
        category: 'skincare',
        hasInci: false,
      })
    ).toEqual({ indexable: false, reason: 'missing-inci' })
  })

  it('excludes product categories outside the public SEO scope', () => {
    expect(
      evaluateSeoEligibility({
        kind: 'product',
        moderationStatus: 'visible',
        category: 'complement',
        hasInci: true,
      })
    ).toEqual({ indexable: false, reason: 'outside-product-scope' })
  })

  it('lets moderation take precedence over catalogue completeness', () => {
    expect(
      evaluateSeoEligibility({
        kind: 'product',
        moderationStatus: 'hidden',
        category: 'skincare',
        hasInci: false,
      })
    ).toEqual({ indexable: false, reason: 'not-visible' })
  })

  it('preserves the current policy for visible ingredients', () => {
    expect(evaluateSeoEligibility({ kind: 'ingredient', moderationStatus: 'visible' })).toEqual({
      indexable: true,
      reason: 'eligible',
    })
  })

  it('excludes hidden ingredients', () => {
    expect(evaluateSeoEligibility({ kind: 'ingredient', moderationStatus: 'hidden' })).toEqual({
      indexable: false,
      reason: 'not-visible',
    })
  })
})
