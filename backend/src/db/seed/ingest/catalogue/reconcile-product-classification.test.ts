import { describe, expect, it } from 'bun:test'

import {
  applyImportedProductClassification,
  reconcileImportedProductClassification,
} from './reconcile-product-classification'

describe('reconcileImportedProductClassification', () => {
  it('classifies an imported sunscreen from a high-confidence name', () => {
    expect(
      reconcileImportedProductClassification({
        name: 'Relief Sun : Rice + Probiotics SPF50+ PA++++',
        slug: 'beauty-of-joseon-relief-sun',
        inci: 'Aqua, Glycerin',
        category: 'skincare',
        kind: 'moisturizer',
      })
    ).toEqual({
      category: 'solaire',
      kind: 'sunscreen',
      reason: 'sunscreen-name',
    })
  })

  it.each([
    'moisturizer',
    'serum',
    'essence',
    'mist',
  ])('repairs the observed stale skincare kinds: %s', (kind) => {
    expect(
      reconcileImportedProductClassification({
        name: 'Daily Sun Gel FPS-50 PA++++',
        slug: 'daily-sun-gel',
        inci: null,
        category: 'skincare',
        kind,
      })
    ).toMatchObject({ category: 'solaire', kind: 'sunscreen' })
  })

  it.each([
    ['dr-ceuracle-cica-regen-waterproof-sun', 'moisturizer'],
    ['missha-safe-block-rx-uv-cover-tone-up-sun', 'moisturizer'],
    ['dr-ceuracle-tea-tree-purifine-green-up-sun', 'moisturizer'],
    ['dr-ceuracle-hyal-reyouth-moist-sun', 'moisturizer'],
    ['svr-sun-secure-spray-hydratant-ultra-leger-et-invisible', 'mist'],
    ['haruharu-wonder-black-bamboo-top-to-toe-spf-veil', 'moisturizer'],
    ['skin1004-madagascar-centella-hyalu-cica-water-fit-sun-serum-twin-pack', 'serum'],
    ['skin1004-madagascar-centella-probio-cica-glow-sun-ampoule', 'serum'],
    ['abib-heartleaf-sun-essence-calming-drop', 'essence'],
  ])('keeps a confirmed sunscreen correction durable: %s', (slug, kind) => {
    expect(
      reconcileImportedProductClassification({
        name: 'Imported product without a UV index',
        slug,
        inci: null,
        category: 'skincare',
        kind,
      })
    ).toEqual({
      category: 'solaire',
      kind: 'sunscreen',
      reason: 'confirmed-sunscreen-slug',
    })
  })

  it.each([
    ['Sun Cream Cleanser SPF50', 'cleanser'],
    ['Sun Cushion SPF50+ PA++++', 'moisturizer'],
    ['After Sun Cream', 'moisturizer'],
    ['Phyto-Glow Lip Sun Cream SPF45', 'moisturizer'],
    ['Sunscreen Body Lotion SPF50', 'body-lotion'],
  ])('does not override a classification outside the import rule: %s', (name, kind) => {
    expect(
      reconcileImportedProductClassification({
        name,
        slug: 'unrelated-product',
        inci: null,
        category: kind === 'body-lotion' ? 'bodycare' : 'skincare',
        kind,
      })
    ).toBeNull()
  })

  it.each([
    ['Lipid-Balance Cleansing Oil', 'oil'],
    ['Physiopure Huile Démaquillante', 'oil'],
    ['Huile Demaquillante Bio', 'oil'],
    // "yeux" would trip the sunscreen exclusion gate — the cleansing-oil branch
    // runs first.
    ['Huile Démaquillante Yeux Waterproof', 'oil'],
    ['Deep Cleansing Balm', 'balm'],
    ['Le Double Nettoyage Huile & Émulsion', 'oil'],
    ['Le Double Nettoyage Huile & Mousse - Recharge', 'oil'],
    ['Le Double Nettoyage Baume & Gelée', 'balm'],
  ])('reclassifies an imported cleansing oil or balm: %s (%s)', (name, kind) => {
    expect(
      reconcileImportedProductClassification({
        name,
        slug: 'some-cleansing-oil',
        inci: null,
        category: 'skincare',
        kind,
      })
    ).toEqual({ category: 'skincare', kind: 'cleanser', reason: 'cleansing-format-name' })
  })

  it.each([
    'Renewal Treatment Oil',
    'Black Rice Facial Oil',
    'Luna Sleeping Night Oil',
    'Huile Prodigieuse® Or',
    'Rosehip BioRegenerate Oil',
  ])('leaves a leave-on treatment oil as kind=oil: %s', (name) => {
    expect(
      reconcileImportedProductClassification({
        name,
        slug: 'some-face-oil',
        inci: null,
        category: 'skincare',
        kind: 'oil',
      })
    ).toBeNull()
  })

  it('does not reclassify a cleansing-format name outside kind=oil|balm', () => {
    expect(
      reconcileImportedProductClassification({
        name: 'Cleansing Oil Serum',
        slug: 'cleansing-oil-serum',
        inci: null,
        category: 'skincare',
        kind: 'serum',
      })
    ).toBeNull()
  })

  it.each([
    ['oil', 'huile'],
    ['balm', 'baume'],
  ])('preserves the imported cleansing format as texture: %s -> %s', (kind, texture) => {
    const prepared = applyImportedProductClassification(
      {
        name: 'Le Double Nettoyage',
        category: 'skincare',
        kind,
      },
      'le-double-nettoyage'
    )

    expect(prepared.row).toMatchObject({
      category: 'skincare',
      kind: 'cleanser',
      texture,
    })
  })

  it('does not replace an explicit imported texture while repairing the kind', () => {
    const prepared = applyImportedProductClassification(
      {
        name: 'Cleansing Oil',
        category: 'skincare',
        kind: 'oil',
        texture: 'eau',
      },
      'cleansing-oil'
    )

    expect(prepared.row).toMatchObject({ kind: 'cleanser', texture: 'eau' })
  })

  it('keeps an explicit catalogue verdict authoritative over automatic repair', () => {
    const prepared = applyImportedProductClassification(
      {
        name: 'Daily Sun Cream SPF50',
        slug: 'daily-sun-cream',
        inci: null,
        category: 'skincare',
        kind: 'moisturizer',
      },
      'daily-sun-cream',
      { category: 'skincare', kind: 'moisturizer' }
    )

    expect(prepared.row).toMatchObject({ category: 'skincare', kind: 'moisturizer' })
    expect(prepared.reconciliation).toBeNull()
  })
})
