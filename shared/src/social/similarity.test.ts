import { describe, expect, it } from 'bun:test'

import {
  projectConcernsToBuckets,
  type SkinSimilarityInput,
  skinSimilarity,
  skinSimilarityScore,
} from './similarity'

describe('skinSimilarity', () => {
  it('rates an identical skin profile as the closest band', () => {
    const me: SkinSimilarityInput = {
      skinConcerns: ['rosacee'],
      skinTypes: ['peau-sensible'],
      fitzpatrickType: 3,
    }

    expect(skinSimilarity(me, me)).toBe('tres-proche')
    expect(skinSimilarityScore(me, me)).toBe(1)
  })

  // Doctrine encoded in the threshold: a matching skin type + phototype alone
  // cannot reach the top band — "très proche" must always mean a shared skin
  // problem, never merely a matching phototype.
  it('never reaches the top band on skin type + phototype alone', () => {
    const a: SkinSimilarityInput = {
      skinConcerns: ['rosacee'],
      skinTypes: ['peau-grasse'],
      fitzpatrickType: 2,
    }
    const b: SkinSimilarityInput = {
      skinConcerns: ['anti-acne'], // disjoint concern bucket
      skinTypes: ['peau-grasse'], // same type
      fitzpatrickType: 2, // same phototype
    }

    expect(skinSimilarity(a, b)).toBe('proche')
  })

  // Two people naming the same condition differently still match: the four
  // rosacée-family concerns collapse onto one clinical bucket.
  it('treats rosacée and couperose as the same condition', () => {
    const a: SkinSimilarityInput = {
      skinConcerns: ['rosacee'],
      skinTypes: null,
      fitzpatrickType: null,
    }
    const b: SkinSimilarityInput = {
      skinConcerns: ['couperose'],
      skinTypes: null,
      fitzpatrickType: null,
    }

    expect(skinSimilarity(a, b)).toBe('tres-proche')
  })

  // A missing Fitzpatrick on both sides drops that component and renormalizes:
  // absent data reads as neutral, not a penalty — same band as a full match.
  it('does not penalize a missing Fitzpatrick (renormalizes)', () => {
    const a: SkinSimilarityInput = {
      skinConcerns: ['rosacee'],
      skinTypes: ['peau-sensible'],
      fitzpatrickType: null,
    }
    const b: SkinSimilarityInput = {
      skinConcerns: ['rosacee'],
      skinTypes: ['peau-sensible'],
      fitzpatrickType: null,
    }

    expect(skinSimilarity(a, b)).toBe('tres-proche')
    expect(skinSimilarityScore(a, b)).toBe(1)
  })

  it('rates two fully disjoint skin profiles as distant', () => {
    const a: SkinSimilarityInput = {
      skinConcerns: ['rosacee'],
      skinTypes: ['peau-grasse'],
      fitzpatrickType: 1,
    }
    const b: SkinSimilarityInput = {
      skinConcerns: ['anti-acne'],
      skinTypes: ['peau-seche'],
      fitzpatrickType: 6,
    }

    expect(skinSimilarity(a, b)).toBe('eloigne')
    expect(skinSimilarityScore(a, b)).toBe(0)
  })
})

describe('projectConcernsToBuckets', () => {
  it('collapses the rosacée family onto a single bucket', () => {
    const buckets = projectConcernsToBuckets(['rosacee', 'couperose', 'flushs', 'anti-rougeurs'])

    expect(buckets.size).toBe(1)
  })

  it('maps differently-named family members onto the same bucket', () => {
    expect([...projectConcernsToBuckets(['rosacee'])]).toEqual([
      ...projectConcernsToBuckets(['couperose']),
    ])
  })

  it('fans one concern out to several buckets when the taxonomy does', () => {
    // post-acne → acné-imperfections + réparation
    expect(projectConcernsToBuckets(['post-acne']).size).toBe(2)
  })
})
