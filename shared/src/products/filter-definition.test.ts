import { describe, expect, test } from 'bun:test'

import { getProductFilterDefinition } from './index'

describe('getProductFilterDefinition', () => {
  test('returns skincare filter groups in display order', () => {
    const definition = getProductFilterDefinition('skincare')

    expect(definition.map(({ key }) => key)).toEqual([
      'skin_zone',
      'concern',
      'skin_effect',
      'skin_type',
      'product_type_v2',
      'texture',
      'routine_step_v2',
      'routine_moment',
      'sensation',
      'product_characteristic',
      'actif_class',
    ])
  })

  test('resolves complete display metadata at the interface', () => {
    const definition = getProductFilterDefinition('skincare')

    expect(definition.find(({ key }) => key === 'skin_zone')).toMatchObject({
      label: 'Zone',
      placeholder: 'Toutes',
      tier: 'essential',
      defaultOpen: true,
    })
    expect(definition.find(({ key }) => key === 'product_type_v2')).toMatchObject({
      label: 'Type de produit',
      placeholder: 'Tous',
      tier: 'essential',
      defaultOpen: false,
    })
    expect(definition.find(({ key }) => key === 'routine_step_v2')).toMatchObject({
      label: 'Étape routine',
      placeholder: 'Toutes',
      tier: 'advanced',
      defaultOpen: false,
    })
  })

  test('returns semantic options in their shared display order', () => {
    const texture = getProductFilterDefinition('skincare').find(({ key }) => key === 'texture')

    expect(texture?.options.map(({ value }) => value)).toEqual([
      'texture-gel',
      'texture-creme',
      'texture-baume',
      'texture-huile',
      'texture-lait',
      'texture-mousse',
      'texture-eau',
      'texture-patch',
      'texture-stick',
    ])
  })

  test('returns non-semantic options in French alphabetical order', () => {
    const skinType = getProductFilterDefinition('skincare').find(({ key }) => key === 'skin_type')
    const labels = skinType?.options.map(({ label }) => label) ?? []

    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, 'fr')))
  })

  test('returns complete skincare display subgroups', () => {
    const definition = getProductFilterDefinition('skincare')
    const concern = definition.find(({ key }) => key === 'concern')
    const characteristics = definition.find(({ key }) => key === 'product_characteristic')

    expect(concern?.subGroups).toEqual([
      {
        label: 'Problèmes fonctionnels',
        slugs: [
          'acne-imperfections',
          'rougeurs-vasculaires',
          'eczema-atopie',
          'barriere-cutanee',
          'hyperpigmentation',
          'reparation-cutanee',
          'keratose-pilaire',
          'deshydratation',
        ],
      },
      {
        label: 'Objectifs esthétiques',
        slugs: ['eclat-teint-uniforme', 'anti-age', 'pores-sebum', 'cernes-poches', 'protection'],
      },
    ])
    expect(characteristics?.subGroups?.map(({ label }) => label)).toEqual([
      'Tolérance & sécurité',
      'Labels et engagements',
      'Technique',
      'Comédogénicité',
    ])
    expect(
      characteristics?.subGroups?.find(({ label }) => label === 'Labels et engagements')?.slugs
    ).toEqual(['bio-naturel', 'vegan', 'cruelty-free'])
  })

  test('returns complete ordered definitions for every product domain', () => {
    expect(getProductFilterDefinition('haircare').map(({ key }) => key)).toEqual([
      'hair_type',
      'concern',
      'product_type',
      'routine_step',
      'hair_effect',
      'product_label',
    ])
    expect(getProductFilterDefinition('dental').map(({ key }) => key)).toEqual([
      'concern',
      'age_group',
      'product_type',
      'dental_effect',
      'product_label',
    ])
    expect(getProductFilterDefinition('complement').map(({ key }) => key)).toEqual([
      'goal',
      'product_type',
      'moment',
      'restriction',
      'product_label',
    ])

    for (const domain of ['haircare', 'dental', 'complement'] as const) {
      for (const group of getProductFilterDefinition(domain)) {
        expect(group.options.length).toBeGreaterThan(0)
        expect(group.subGroups).toBeUndefined()
      }
    }
  })
})
