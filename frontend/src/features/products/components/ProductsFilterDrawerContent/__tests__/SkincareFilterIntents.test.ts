import { describe, expect, it } from 'vitest'

import type { FilterGroupConfig } from '@/component/Filter/types'
import { emptyFilters } from '@/features/products/__tests__/fixtures'
import type { FilterKey } from '@/features/products/filters'
import {
  applySearchIntent,
  inferActiveIntent,
  isSearchIntentAvailable,
  SEARCH_INTENTS,
} from '../SkincareFilterIntents'

function intentGroups(texture: 'enabled' | 'disabled' | 'missing'): FilterGroupConfig<FilterKey>[] {
  return [
    {
      id: 'product',
      label: 'Produit',
      defaultOpen: true,
      tier: 'essential',
      subFilters: [
        {
          key: 'product_type_v2',
          label: 'Type',
          placeholder: 'Tous',
          options: [{ value: 'type-hydratant', label: 'Hydratant' }],
        },
        {
          key: 'texture',
          label: 'Texture',
          placeholder: 'Toutes',
          options:
            texture === 'missing'
              ? []
              : [{ value: 'texture-creme', label: 'Crème', disabled: texture === 'disabled' }],
        },
      ],
    },
  ]
}

describe('skincare filter intents', () => {
  it('replaces the active intent axes and preserves manual refinements', () => {
    const cream = SEARCH_INTENTS.find((intent) => intent.id === 'cream-moisturizer')
    const gel = SEARCH_INTENTS.find((intent) => intent.id === 'gel-cleanser')
    if (!cream || !gel) throw new Error('Test intents are missing')

    const withCream = applySearchIntent(emptyFilters(), cream)
    const withManualConcern = {
      ...withCream,
      concern: ['acne-imperfections'],
    }

    expect(applySearchIntent(withManualConcern, gel)).toMatchObject({
      concern: ['acne-imperfections'],
      product_type_v2: ['type-nettoyant'],
      texture: ['texture-gel'],
    })
  })

  it('infers the exact preset when only its axes are filled', () => {
    const filters = {
      ...emptyFilters(),
      product_type_v2: ['type-nettoyant'],
      texture: ['texture-gel'],
    }
    expect(inferActiveIntent(filters)?.id).toBe('gel-cleanser')
  })

  it('does not infer an intent when an axis beyond the preset is filled', () => {
    // A preset is active only if the values match exactly. An extra axis
    // (skin_zone) means neither "Gel nettoyant" nor "Nettoyant visage" is exact.
    const filters = {
      ...emptyFilters(),
      product_type_v2: ['type-nettoyant'],
      texture: ['texture-gel'],
      skin_zone: ['zone-visage'],
    }
    expect(inferActiveIntent(filters)).toBeUndefined()
  })

  it('is available when every canonical option exists and is enabled', () => {
    const cream = SEARCH_INTENTS.find((intent) => intent.id === 'cream-moisturizer')
    if (!cream) throw new Error('Test intent is missing')

    expect(isSearchIntentAvailable(cream, intentGroups('enabled'))).toBe(true)
  })

  it('is unavailable when a canonical option is disabled', () => {
    const cream = SEARCH_INTENTS.find((intent) => intent.id === 'cream-moisturizer')
    if (!cream) throw new Error('Test intent is missing')

    expect(isSearchIntentAvailable(cream, intentGroups('disabled'))).toBe(false)
  })

  it('is unavailable when a canonical option is missing', () => {
    const cream = SEARCH_INTENTS.find((intent) => intent.id === 'cream-moisturizer')
    if (!cream) throw new Error('Test intent is missing')

    expect(isSearchIntentAvailable(cream, intentGroups('missing'))).toBe(false)
  })
})
