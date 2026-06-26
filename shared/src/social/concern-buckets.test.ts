import { describe, expect, it } from 'bun:test'

import { concernsSharingBucket } from './concern-buckets'

describe('concernsSharingBucket', () => {
  it('expands a concern to every concern in the same clinical bucket', () => {
    // The four rosacée-family concerns all collapse on rougeurs-vasculaires.
    expect(new Set(concernsSharingBucket('rosacee'))).toEqual(
      new Set(['anti-rougeurs', 'rosacee', 'couperose', 'flushs'])
    )
  })

  it('includes the searched concern itself', () => {
    expect(concernsSharingBucket('rosacee')).toContain('rosacee')
  })

  it('fans across every bucket a multi-bucket concern touches', () => {
    // post-acne → {acné-imperfections, réparation}; siblings span both.
    expect(new Set(concernsSharingBucket('post-acne'))).toEqual(
      new Set(['anti-acne', 'post-acne', 'cicatrisation'])
    )
  })

  it('returns only itself for a concern with a unique bucket', () => {
    // barriere-cutanee is the sole member of its bucket.
    expect(concernsSharingBucket('barriere-cutanee')).toEqual(['barriere-cutanee'])
  })

  it('groups the pores/sébum family together', () => {
    // pores-dilates / brillance / grain-peau all collapse on pores-sébum.
    expect(new Set(concernsSharingBucket('pores-dilates'))).toEqual(
      new Set(['pores-dilates', 'brillance', 'grain-peau'])
    )
  })
})
