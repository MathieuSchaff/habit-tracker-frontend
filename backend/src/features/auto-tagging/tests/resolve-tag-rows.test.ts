// Pure test (no DB): the persist-filter seam shared by writeTagsForProduct
// (intake), the backfill runner, and reconcile. resolveTagRows must apply
// eczema-atopie withholding, drop unknown slugs and domain-ineligible tag types,
// and preserve (tagSlug, tagId, relevance, source) on every kept row — so the
// three persisting consumers cannot drift on which orchestrator emissions reach
// the DB.

import { describe, expect, it } from 'bun:test'

import { SKINCARE_PRODUCT_TAG_SLUGS } from '@aurore/shared'

import { resolveTagRows } from '../lib/resolve-tag-rows'
import type { AutoTagPair } from '../orchestrator'

const S = SKINCARE_PRODUCT_TAG_SLUGS

const pair = (
  tagSlug: AutoTagPair['tagSlug'],
  relevance: AutoTagPair['relevance'] = 'secondary',
  source: AutoTagPair['source'] = 'formula'
): AutoTagPair => ({ tagSlug, relevance, source })

// 'concern' is a skincare filter category; 'haircare_only' is not → domain-ineligible.
const tagInfo = new Map<string, { id: string; tagType: string }>([
  [S.ECZEMA_ATOPIE, { id: 'id-eczema', tagType: 'concern' }],
  [S.HYPERPIGMENTATION, { id: 'id-hyperpig', tagType: 'concern' }],
  [S.REPARATION, { id: 'id-rep', tagType: 'haircare_only' }],
])

// Names atopy under a contraindication → eczemaAtopieDescriptionNeedsReview true.
const CONTRA = 'Déconseillé aux peaux atopiques sévères.'
const BENIGN = 'Apaise les sensations de démangeaison.'

describe('resolveTagRows — persist-filter seam', () => {
  it('withholds eczema-atopie when the description contraindicates atopy', () => {
    const { rows, withheld } = resolveTagRows(
      [pair(S.ECZEMA_ATOPIE), pair(S.HYPERPIGMENTATION)],
      { category: 'skincare', description: CONTRA },
      tagInfo
    )
    expect(withheld).toBe(true)
    expect(rows.map((r) => r.tagSlug)).toEqual([S.HYPERPIGMENTATION])
  })

  it('keeps eczema-atopie on a benign description (withheld=false)', () => {
    const { rows, withheld } = resolveTagRows(
      [pair(S.ECZEMA_ATOPIE)],
      { category: 'skincare', description: BENIGN },
      tagInfo
    )
    expect(withheld).toBe(false)
    expect(rows.map((r) => r.tagSlug)).toEqual([S.ECZEMA_ATOPIE])
  })

  it('drops a pair whose slug is unknown to the tag map', () => {
    const { rows } = resolveTagRows(
      [pair(S.ANTI_AGE)], // not in tagInfo
      { category: 'skincare', description: null },
      tagInfo
    )
    expect(rows).toHaveLength(0)
  })

  it('drops a pair whose tagType is ineligible for the product domain', () => {
    const { rows } = resolveTagRows(
      [pair(S.REPARATION)], // mapped to a tagType in no domain's filter set
      { category: 'skincare', description: null },
      tagInfo
    )
    expect(rows).toHaveLength(0)
  })

  it('preserves tagSlug, tagId, relevance and source on kept rows', () => {
    const { rows } = resolveTagRows(
      [pair(S.HYPERPIGMENTATION, 'primary', 'algo-derm')],
      { category: 'skincare', description: null },
      tagInfo
    )
    expect(rows).toEqual([
      {
        tagSlug: S.HYPERPIGMENTATION,
        tagId: 'id-hyperpig',
        relevance: 'primary',
        source: 'algo-derm',
      },
    ])
  })
})
