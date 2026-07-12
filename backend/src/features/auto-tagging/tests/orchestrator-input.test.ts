// Pure tests (no DB) for the input-assembly seam. Guards the field-threading
// bug class this module exists to kill (a caller dropping texture/brand made
// detection silently blind) and the kernel's persist-filter fusion. The filter
// behaviour itself is covered by resolve-tag-rows.test.ts — not restated here.

import { describe, expect, it } from 'bun:test'

import { SKINCARE_PRODUCT_TAG_SLUGS } from '@aurore/shared'

import {
  type AutoTagFetchBundle,
  buildOrchestratorInput,
  computeTagRowsForProduct,
  type OrchestratorProductFields,
} from '../lib/orchestrator-input'
import { detectAllAutoTags } from '../orchestrator'

const S = SKINCARE_PRODUCT_TAG_SLUGS

const baseFields: OrchestratorProductFields = {
  inci: 'aqua, glycerin',
  kind: 'serum',
  category: 'skincare',
  brand: null,
  texture: null,
  name: null,
  description: null,
}

const makeBundle = (over: Partial<AutoTagFetchBundle> = {}): AutoTagFetchBundle => ({
  brandCertifications: new Map(),
  tagSlugToInfo: new Map(),
  percentClaimsByProduct: new Map(),
  knownConcentrationsByProduct: new Map(),
  ...over,
})

describe('orchestrator-input — input-assembly seam', () => {
  it('threads texture into detection (texture-from-field fires only via the field)', () => {
    const withTexture = detectAllAutoTags(buildOrchestratorInput({ ...baseFields, texture: 'gel' }))
    expect(withTexture.map((p) => p.tagSlug)).toContain(S.TEXTURE_GEL)

    const withoutTexture = detectAllAutoTags(buildOrchestratorInput(baseFields))
    expect(withoutTexture.map((p) => p.tagSlug)).not.toContain(S.TEXTURE_GEL)
  })

  it('kernel threads brand + bundle certifications into the brand pass', () => {
    const { pairs } = computeTagRowsForProduct(
      { ...baseFields, id: 'p1', brand: 'Lamazuna' },
      makeBundle({
        brandCertifications: new Map([
          [
            'lamazuna',
            {
              brandNormalized: 'lamazuna',
              brandDisplay: 'Lamazuna',
              isVegan: true,
              isCrueltyFree: false,
              isNaturalCertified: false,
              sources: {},
              notes: null,
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        ]),
      })
    )
    expect(pairs.map((p) => p.tagSlug)).toContain(S.VEGAN)
  })

  it('kernel applies the persist filter: eczema-atopie in pairs, withheld from rows', () => {
    const { pairs, rows, withheld } = computeTagRowsForProduct(
      {
        ...baseFields,
        id: 'p1',
        name: 'Baume eczéma',
        description: 'Déconseillé aux peaux atopiques sévères.',
      },
      makeBundle({
        tagSlugToInfo: new Map([[S.ECZEMA_ATOPIE, { id: 'id-eczema', tagType: 'concern' }]]),
      })
    )
    expect(pairs.map((p) => p.tagSlug)).toContain(S.ECZEMA_ATOPIE)
    expect(rows.map((r) => r.tagSlug)).not.toContain(S.ECZEMA_ATOPIE)
    expect(withheld).toBe(true)
  })
})
