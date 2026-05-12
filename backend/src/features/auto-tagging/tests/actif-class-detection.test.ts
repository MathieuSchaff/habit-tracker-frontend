import { describe, expect, test } from 'bun:test'

import { SKINCARE_PRODUCT_TAG_SLUGS } from '@habit-tracker/shared'

import { detectActifClasses } from '../passes/actif-class-detection'

describe('actif-class-detection', () => {
  test('empty/null/whitespace INCI returns []', () => {
    expect(detectActifClasses(null)).toEqual([])
    expect(detectActifClasses(undefined)).toEqual([])
    expect(detectActifClasses('')).toEqual([])
    expect(detectActifClasses('   ')).toEqual([])
  })

  test('detects retinoids cluster from canonical INCI', () => {
    const inci = 'Aqua, Retinol, Glycerin, Tocopherol'
    const classes = detectActifClasses(inci)
    expect(classes).toContain(SKINCARE_PRODUCT_TAG_SLUGS.RETINOIDS)
    expect(classes).toContain(SKINCARE_PRODUCT_TAG_SLUGS.VITAMIN_E)
  })

  test('detects vitamin C variants (different esters)', () => {
    const inci = 'Aqua, Ascorbyl Glucoside, Sodium Ascorbyl Phosphate, Glycerin'
    expect(detectActifClasses(inci)).toContain(SKINCARE_PRODUCT_TAG_SLUGS.VITAMIN_C)
  })

  test('detects multiple clusters in the same product', () => {
    const inci = 'Aqua, Glycolic Acid, Salicylic Acid, Hyaluronic Acid, Ceramide NP'
    const classes = detectActifClasses(inci)
    expect(classes).toEqual(
      expect.arrayContaining([
        SKINCARE_PRODUCT_TAG_SLUGS.AHA,
        SKINCARE_PRODUCT_TAG_SLUGS.BHA,
        SKINCARE_PRODUCT_TAG_SLUGS.HYALURONIC_ACID,
        SKINCARE_PRODUCT_TAG_SLUGS.CERAMIDES,
      ])
    )
  })

  test('AHA family detection (glycolic, lactic, mandelic)', () => {
    expect(detectActifClasses('Aqua, Glycolic Acid')).toContain(SKINCARE_PRODUCT_TAG_SLUGS.AHA)
    expect(detectActifClasses('Aqua, Lactic Acid')).toContain(SKINCARE_PRODUCT_TAG_SLUGS.AHA)
    expect(detectActifClasses('Aqua, Mandelic Acid')).toContain(SKINCARE_PRODUCT_TAG_SLUGS.AHA)
  })

  test('no false positive: pure hydration product gets no exfoliant clusters', () => {
    const inci = 'Aqua, Glycerin, Sodium Hyaluronate, Panthenol'
    const classes = detectActifClasses(inci)
    expect(classes).toContain(SKINCARE_PRODUCT_TAG_SLUGS.HYALURONIC_ACID)
    expect(classes).not.toContain(SKINCARE_PRODUCT_TAG_SLUGS.AHA)
    expect(classes).not.toContain(SKINCARE_PRODUCT_TAG_SLUGS.BHA)
    expect(classes).not.toContain(SKINCARE_PRODUCT_TAG_SLUGS.RETINOIDS)
  })

  test('peptides cluster catches several peptide families', () => {
    expect(detectActifClasses('Aqua, Matrixyl 3000')).toContain(SKINCARE_PRODUCT_TAG_SLUGS.PEPTIDES)
    expect(detectActifClasses('Aqua, Argireline')).toContain(SKINCARE_PRODUCT_TAG_SLUGS.PEPTIDES)
    expect(detectActifClasses('Aqua, Acetyl Hexapeptide-8')).toContain(
      SKINCARE_PRODUCT_TAG_SLUGS.PEPTIDES
    )
  })

  test('case-insensitive (algo-derm normalize handles casing)', () => {
    expect(detectActifClasses('AQUA, RETINOL, GLYCERIN')).toContain(
      SKINCARE_PRODUCT_TAG_SLUGS.RETINOIDS
    )
    expect(detectActifClasses('aqua, retinol, glycerin')).toContain(
      SKINCARE_PRODUCT_TAG_SLUGS.RETINOIDS
    )
  })

  test('no duplicates in result', () => {
    // Two retinoids in the same INCI → cluster appears once
    const inci = 'Aqua, Retinol, Retinyl Palmitate'
    const classes = detectActifClasses(inci)
    const retinoidCount = classes.filter((c) => c === SKINCARE_PRODUCT_TAG_SLUGS.RETINOIDS).length
    expect(retinoidCount).toBe(1)
  })

  test('position gating: AHA at INCI position 25 is not detected', () => {
    // Lactic acid as pH adjuster at the tail end — not at functional concentration.
    const filler = Array.from({ length: 24 }, (_, i) => `Filler${i + 1}`).join(', ')
    const inci = `Aqua, ${filler}, Lactic Acid`
    expect(detectActifClasses(inci)).not.toContain(SKINCARE_PRODUCT_TAG_SLUGS.AHA)
  })

  test('position gating: retinol within early INCI is detected', () => {
    const filler = Array.from({ length: 9 }, (_, i) => `Filler${i + 1}`).join(', ')
    const inci = `Aqua, ${filler}, Retinol`
    expect(detectActifClasses(inci)).toContain(SKINCARE_PRODUCT_TAG_SLUGS.RETINOIDS)
  })

  test('position gating: HA humectant in top 10 still detected', () => {
    const inci = 'Aqua, Glycerin, Sodium Hyaluronate, Panthenol'
    expect(detectActifClasses(inci)).toContain(SKINCARE_PRODUCT_TAG_SLUGS.HYALURONIC_ACID)
  })

  test('vitamin-E: full-scan (no positionCap) — antioxidant trace at tail still detected', () => {
    const filler = Array.from({ length: 30 }, (_, i) => `Filler${i + 1}`).join(', ')
    const inci = `Aqua, ${filler}, Tocopherol`
    expect(detectActifClasses(inci)).toContain(SKINCARE_PRODUCT_TAG_SLUGS.VITAMIN_E)
  })

  test('vitamin-E: tocopheryl ester variants (acetate, succinate, nicotinate)', () => {
    expect(detectActifClasses('Aqua, Tocopheryl Acetate')).toContain(
      SKINCARE_PRODUCT_TAG_SLUGS.VITAMIN_E
    )
    expect(detectActifClasses('Aqua, Tocopheryl Succinate')).toContain(
      SKINCARE_PRODUCT_TAG_SLUGS.VITAMIN_E
    )
    expect(detectActifClasses('Aqua, Tocopheryl Nicotinate')).toContain(
      SKINCARE_PRODUCT_TAG_SLUGS.VITAMIN_E
    )
  })

  test('vitamin-E: tocotrienol family detected', () => {
    expect(detectActifClasses('Aqua, Glycerin, Tocotrienol')).toContain(
      SKINCARE_PRODUCT_TAG_SLUGS.VITAMIN_E
    )
  })

  test('HA: full-scan (no positionCap) — humectant at tail still detected', () => {
    const filler = Array.from({ length: 25 }, (_, i) => `Filler${i + 1}`).join(', ')
    const inci = `Aqua, ${filler}, Sodium Hyaluronate`
    expect(detectActifClasses(inci)).toContain(SKINCARE_PRODUCT_TAG_SLUGS.HYALURONIC_ACID)
  })

  test('HA: variants caught by single hyaluron substring', () => {
    expect(detectActifClasses('Aqua, Dimethylsilanol Hyaluronate')).toContain(
      SKINCARE_PRODUCT_TAG_SLUGS.HYALURONIC_ACID
    )
    expect(detectActifClasses('Aqua, Sodium Acetylated Hyaluronate')).toContain(
      SKINCARE_PRODUCT_TAG_SLUGS.HYALURONIC_ACID
    )
    expect(detectActifClasses('Aqua, Hydrolyzed Hyaluronic Acid')).toContain(
      SKINCARE_PRODUCT_TAG_SLUGS.HYALURONIC_ACID
    )
  })

  test('peptides: full-scan (no positionCap) — anti-aging blend at tail still detected', () => {
    const filler = Array.from({ length: 25 }, (_, i) => `Filler${i + 1}`).join(', ')
    const inci = `Aqua, ${filler}, Palmitoyl Tripeptide-1`
    expect(detectActifClasses(inci)).toContain(SKINCARE_PRODUCT_TAG_SLUGS.PEPTIDES)
  })

  test('polyphenols: full-scan + vitis vinifera variant', () => {
    expect(detectActifClasses('Aqua, Glycerin, Vitis Vinifera Seed Oil')).toContain(
      SKINCARE_PRODUCT_TAG_SLUGS.POLYPHENOLS
    )
    const filler = Array.from({ length: 20 }, (_, i) => `Filler${i + 1}`).join(', ')
    const inci = `Aqua, ${filler}, Camellia Sinensis Seed Oil`
    expect(detectActifClasses(inci)).toContain(SKINCARE_PRODUCT_TAG_SLUGS.POLYPHENOLS)
  })

  test('AHA: position cap 10 retained — lactic acid past pos 10 = pH adjuster, not exfoliant', () => {
    const filler = Array.from({ length: 15 }, (_, i) => `Filler${i + 1}`).join(', ')
    const inci = `Aqua, ${filler}, Lactic Acid`
    expect(detectActifClasses(inci)).not.toContain(SKINCARE_PRODUCT_TAG_SLUGS.AHA)
  })

  test('BHA: position cap 10 retained — salicylic acid past pos 10 = preservative trace', () => {
    const filler = Array.from({ length: 15 }, (_, i) => `Filler${i + 1}`).join(', ')
    const inci = `Aqua, ${filler}, Salicylic Acid`
    expect(detectActifClasses(inci)).not.toContain(SKINCARE_PRODUCT_TAG_SLUGS.BHA)
  })

  test('PHA: position cap 10 retained — gluconolactone past pos 10 = preservative booster', () => {
    const filler = Array.from({ length: 15 }, (_, i) => `Filler${i + 1}`).join(', ')
    const inci = `Aqua, ${filler}, Gluconolactone`
    expect(detectActifClasses(inci)).not.toContain(SKINCARE_PRODUCT_TAG_SLUGS.PHA)
  })

  test('enzymes: full-scan (no positionCap) — papain at tail still detected', () => {
    const filler = Array.from({ length: 20 }, (_, i) => `Filler${i + 1}`).join(', ')
    const inci = `Aqua, ${filler}, Papain`
    expect(detectActifClasses(inci)).toContain(SKINCARE_PRODUCT_TAG_SLUGS.ENZYMES_EXFOLIANTS)
  })

  test('enzymes: lipase variant detected (multi-enzyme exfoliants)', () => {
    expect(detectActifClasses('Aqua, Glycerin, Lipase, Protease')).toContain(
      SKINCARE_PRODUCT_TAG_SLUGS.ENZYMES_EXFOLIANTS
    )
    const filler = Array.from({ length: 14 }, (_, i) => `Filler${i + 1}`).join(', ')
    const inci = `Aqua, ${filler}, Lipase`
    expect(detectActifClasses(inci)).toContain(SKINCARE_PRODUCT_TAG_SLUGS.ENZYMES_EXFOLIANTS)
  })

  test('enzymes: papain marketing variants (asterisk, parenthetical)', () => {
    expect(detectActifClasses('Aqua, Papain*')).toContain(
      SKINCARE_PRODUCT_TAG_SLUGS.ENZYMES_EXFOLIANTS
    )
    expect(detectActifClasses('Aqua, Papain (Papaya Enzyme)')).toContain(
      SKINCARE_PRODUCT_TAG_SLUGS.ENZYMES_EXFOLIANTS
    )
  })

  test('retinoids: full-scan (no positionCap) — encapsulated retinol at tail still detected', () => {
    const filler = Array.from({ length: 30 }, (_, i) => `Filler${i + 1}`).join(', ')
    const inci = `Aqua, ${filler}, Retinol`
    expect(detectActifClasses(inci)).toContain(SKINCARE_PRODUCT_TAG_SLUGS.RETINOIDS)
  })

  test('retinoids: retinaldehyde marketing variant `Retinal (Retinaldehyde)`', () => {
    expect(detectActifClasses('Aqua, Glycerin, Retinal (Retinaldehyde)')).toContain(
      SKINCARE_PRODUCT_TAG_SLUGS.RETINOIDS
    )
    const filler = Array.from({ length: 30 }, (_, i) => `Filler${i + 1}`).join(', ')
    const inci = `Aqua, ${filler}, Retinal (Retinaldehyde)`
    expect(detectActifClasses(inci)).toContain(SKINCARE_PRODUCT_TAG_SLUGS.RETINOIDS)
  })

  test('retinoids: bakuchiol NOT tagged as retinoid (chemically distinct)', () => {
    expect(detectActifClasses('Aqua, Glycerin, Bakuchiol')).not.toContain(
      SKINCARE_PRODUCT_TAG_SLUGS.RETINOIDS
    )
  })

  test('vitamin-C: full-scan (no positionCap) — ascorbyl palmitate at tail still detected', () => {
    const filler = Array.from({ length: 25 }, (_, i) => `Filler${i + 1}`).join(', ')
    const inci = `Aqua, ${filler}, Ascorbyl Palmitate`
    expect(detectActifClasses(inci)).toContain(SKINCARE_PRODUCT_TAG_SLUGS.VITAMIN_C)
  })

  test('vitamin-C: 3-O-ethyl ascorbic acid caught via `ethyl ascorbic acid` substring', () => {
    expect(detectActifClasses('Aqua, Glycerin, 3-O-Ethyl Ascorbic Acid')).toContain(
      SKINCARE_PRODUCT_TAG_SLUGS.VITAMIN_C
    )
  })

  test('vitamin-C: marketing INCI `Vitamin C Ester (Ascorbyl Palmitate)`', () => {
    expect(detectActifClasses('Aqua, Vitamin C Ester (Ascorbyl Palmitate)')).toContain(
      SKINCARE_PRODUCT_TAG_SLUGS.VITAMIN_C
    )
  })

  test('ceramides: full-scan (no positionCap) — relipidant blend at tail still detected', () => {
    const filler = Array.from({ length: 30 }, (_, i) => `Filler${i + 1}`).join(', ')
    const inci = `Aqua, ${filler}, Ceramide NP`
    expect(detectActifClasses(inci)).toContain(SKINCARE_PRODUCT_TAG_SLUGS.CERAMIDES)
  })

  test('ceramides: NG and AS variants detected', () => {
    expect(detectActifClasses('Aqua, Glycerin, Ceramide NG')).toContain(
      SKINCARE_PRODUCT_TAG_SLUGS.CERAMIDES
    )
    expect(detectActifClasses('Aqua, Glycerin, Ceramide AS')).toContain(
      SKINCARE_PRODUCT_TAG_SLUGS.CERAMIDES
    )
  })

  test('ceramides: phytosphingosine alone NOT tagged (precursor, not ceramide)', () => {
    expect(detectActifClasses('Aqua, Glycerin, Phytosphingosine')).not.toContain(
      SKINCARE_PRODUCT_TAG_SLUGS.CERAMIDES
    )
  })

  test('tyrosinase: full-scan (no positionCap) — alpha-arbutin at tail still detected', () => {
    const filler = Array.from({ length: 25 }, (_, i) => `Filler${i + 1}`).join(', ')
    const inci = `Aqua, ${filler}, Alpha-Arbutin`
    expect(detectActifClasses(inci)).toContain(SKINCARE_PRODUCT_TAG_SLUGS.TYROSINASE_INHIBITORS)
  })

  test('tyrosinase: undecylenoyl phenylalanine + hexylresorcinol detected', () => {
    expect(detectActifClasses('Aqua, Glycerin, Undecylenoyl Phenylalanine')).toContain(
      SKINCARE_PRODUCT_TAG_SLUGS.TYROSINASE_INHIBITORS
    )
    expect(detectActifClasses('Aqua, Glycerin, Hexylresorcinol')).toContain(
      SKINCARE_PRODUCT_TAG_SLUGS.TYROSINASE_INHIBITORS
    )
  })

  test('tyrosinase: niacinamide alone NOT tagged (different mechanism)', () => {
    expect(detectActifClasses('Aqua, Glycerin, Niacinamide')).not.toContain(
      SKINCARE_PRODUCT_TAG_SLUGS.TYROSINASE_INHIBITORS
    )
  })

  test('tyrosinase: glycyrrhiza alone NOT tagged (over-broadening — soothing ingredient)', () => {
    expect(detectActifClasses('Aqua, Glycerin, Glycyrrhiza Glabra Root Extract')).not.toContain(
      SKINCARE_PRODUCT_TAG_SLUGS.TYROSINASE_INHIBITORS
    )
    expect(detectActifClasses('Aqua, Glycerin, Dipotassium Glycyrrhizate')).not.toContain(
      SKINCARE_PRODUCT_TAG_SLUGS.TYROSINASE_INHIBITORS
    )
  })

  test('vitamin-C: French INCI — acide ascorbique detected', () => {
    expect(detectActifClasses('Eau, Glycérine, Acide Ascorbique')).toContain(
      SKINCARE_PRODUCT_TAG_SLUGS.VITAMIN_C
    )
  })

  test('vitamin-C: French INCI — acide 3-o-éthyl ascorbique detected', () => {
    expect(
      detectActifClasses('1,2-Hexanediol, Acide 3-O-Éthyl Ascorbique, Butylène Glycol')
    ).toContain(SKINCARE_PRODUCT_TAG_SLUGS.VITAMIN_C)
  })

  test('polyphenols: melissa officinalis detected', () => {
    expect(detectActifClasses('Aqua, Glycerin, Melissa Officinalis Leaf Extract')).toContain(
      SKINCARE_PRODUCT_TAG_SLUGS.POLYPHENOLS
    )
  })
})
