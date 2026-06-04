import { describe, expect, test } from 'bun:test'

import { SKINCARE_PRODUCT_TAG_SLUGS } from '@aurore/shared'

import {
  detectAbsenceClaimsFromText,
  detectAcneImperfectionsFromName,
  detectAntiAgeFromName,
  detectApaisantFromName,
  detectBarriereCutaneeFromName,
  detectCernesPoches,
  detectDeshydratationFromName,
  detectEclatTeintFromName,
  detectEczemaAtopieFromName,
  detectFiniMat,
  detectHyperpigmentationFromName,
  detectKeratosePilaire,
  detectNonGras,
  detectOcclusifTags,
  detectPeauNormale,
  detectPigmentsVerts,
  detectPoresSebumFromName,
  detectPrebiotique,
  detectProtection,
  detectReparationCutanee,
  detectRepulpant,
  detectRougeursVasculairesFromName,
  detectSansSavon,
  detectSemiOcclusif,
  detectSolaireTags,
  detectStepNettoyage1,
  detectTextureBaumeFromName,
  detectTextureCremeEyeInci,
  detectTextureCremeInci,
  detectTextureFromField,
  detectTextureGelInci,
  detectTextureLegere,
  detectTextureRiche,
  detectTextureStickFromName,
  eczemaAtopieDescriptionNeedsReview,
  partitionEczemaReview,
} from '../passes/formula'

const S = SKINCARE_PRODUCT_TAG_SLUGS

describe('detectOcclusifTags', () => {
  test('petrolatum in top 8 → occlusif tags', () => {
    const tags = detectOcclusifTags('Aqua, Petrolatum, Glycerin')
    expect(tags.length).toBeGreaterThan(0)
  })

  test('petrolatum past position 8 → not flagged (texture emollient)', () => {
    const filler = Array.from({ length: 8 }, (_, i) => `Filler${i + 1}`).join(', ')
    expect(detectOcclusifTags(`Aqua, ${filler}, Petrolatum`)).toEqual([])
  })
})

describe('detectSemiOcclusif', () => {
  test('squalane top 5 leave-on → semi-occlusif', () => {
    const tags = detectSemiOcclusif('Aqua, Glycerin, Squalane, Niacinamide', 'moisturizer')
    expect(tags).toEqual([S.SEMI_OCCLUSIF])
  })

  test('dimethicone top 5 leave-on → semi-occlusif', () => {
    const tags = detectSemiOcclusif('Aqua, Glycerin, Dimethicone, Tocopherol', 'serum')
    expect(tags).toEqual([S.SEMI_OCCLUSIF])
  })

  test('isohexadecane top 5 leave-on → semi-occlusif', () => {
    const tags = detectSemiOcclusif('Aqua, Isohexadecane, Glycerin, Niacinamide', 'moisturizer')
    expect(tags).toEqual([S.SEMI_OCCLUSIF])
  })

  test('squalane past position 5 → not flagged', () => {
    const filler = Array.from({ length: 5 }, (_, i) => `Filler${i + 1}`).join(', ')
    expect(detectSemiOcclusif(`Aqua, ${filler}, Squalane`, 'moisturizer')).toEqual([])
  })

  test('rinse-off cleanser with dimethicone → not flagged', () => {
    expect(detectSemiOcclusif('Aqua, Dimethicone, Sodium Cocoyl Isethionate', 'cleanser')).toEqual(
      []
    )
  })

  test('mutex with occlusif: petrolatum top 8 + squalane top 5 → not semi-occlusif', () => {
    // True film-former wins. Petrolatum at pos 2, squalane at pos 4: occlusif
    // is functionally accurate, semi-occlusif would dilute the distinction.
    const tags = detectSemiOcclusif(
      'Aqua, Petrolatum, Glycerin, Squalane, Tocopherol',
      'moisturizer'
    )
    expect(tags).toEqual([])
  })

  test('squalene (animal sebum lipid) does not match squalane substring', () => {
    // Cosmetic-grade `squalane` is the saturated form; `squalene` is animal-
    // derived. Pattern keys on the trailing 'ne' so substring lookup stays
    // tight.
    expect(detectSemiOcclusif('Aqua, Glycerin, Squalene, Niacinamide', 'serum')).toEqual([])
  })

  test('cyclomethicone (volatile silicone) does not match dimethicone', () => {
    // Cyclic silicones evaporate from skin and don't reduce TEWL.
    expect(detectSemiOcclusif('Aqua, Cyclomethicone, Glycerin', 'serum')).toEqual([])
  })

  test('dimethiconol top 5 leave-on → semi-occlusif (separate pattern)', () => {
    // `dimethiconol` substring does not contain `dimethicone` (different
    // trailing letter); explicit pattern needed.
    const tags = detectSemiOcclusif('Aqua, Dimethiconol, Glycerin, Tocopherol', 'serum')
    expect(tags).toEqual([S.SEMI_OCCLUSIF])
  })
})

// detectGrossesseAvoid and detectVegan migrated to algo-derm (TAG_DEFS v7).
// Pregnancy and vegan detection tested via detectAutoTags / detectAllAutoTags
// in algo-derm-detection.test.ts and auto-tag-orchestrator-parity.test.ts.

describe('detectSolaireTags — sanity', () => {
  test('avobenzone in sunscreen → filtres-chimiques', () => {
    const tags = detectSolaireTags('Aqua, Avobenzone, Octocrylene', 'sunscreen', 'solaire')
    expect(tags).toContain(S.FILTRES_CHIMIQUES)
    expect(tags).not.toContain(S.FILTRES_MINERAUX)
  })

  test('zinc oxide in sunscreen → filtres-mineraux', () => {
    const tags = detectSolaireTags('Aqua, Zinc Oxide, Glycerin', 'sunscreen', 'solaire')
    expect(tags).toContain(S.FILTRES_MINERAUX)
    expect(tags).not.toContain(S.FILTRES_CHIMIQUES)
  })

  test('both chemical and mineral filters → both tags', () => {
    const tags = detectSolaireTags('Aqua, Avobenzone, Titanium Dioxide', 'sunscreen', 'solaire')
    expect(tags).toContain(S.FILTRES_CHIMIQUES)
    expect(tags).toContain(S.FILTRES_MINERAUX)
  })

  test('zinc oxide in cica cream (skincare) → not flagged', () => {
    expect(detectSolaireTags('Aqua, Zinc Oxide, Centella', 'moisturizer', 'skincare')).toEqual([])
  })
})

describe('detectPrebiotique — sanity', () => {
  test('inulin → prebiotique', () => {
    expect(detectPrebiotique('Aqua, Inulin, Glycerin')).toContain(S.PREBIOTIQUE)
  })

  test('lactobacillus ferment → prebiotique', () => {
    expect(detectPrebiotique('Aqua, Glycerin, Lactobacillus Ferment, Niacinamide')).toContain(
      S.PREBIOTIQUE
    )
  })

  test('no prebiotic ingredient → empty', () => {
    expect(detectPrebiotique('Aqua, Glycerin, Niacinamide, Tocopherol')).toEqual([])
  })
})

describe('detectStepNettoyage1', () => {
  test('oil cleanser (mineral oil pos 1) → step-nettoyage-1', () => {
    expect(
      detectStepNettoyage1(
        'Mineral Oil, Ethylhexyl Palmitate, PEG-20 Glyceryl Triisostearate, Tocopherol',
        'cleanser'
      )
    ).toContain(S.STEP_NETTOYAGE_1)
  })

  test('balm cleanser (shea butter pos 1) → step-nettoyage-1', () => {
    expect(
      detectStepNettoyage1(
        'Butyrospermum Parkii Butter, Caprylic/Capric Triglyceride, Tocopherol',
        'cleanser'
      )
    ).toContain(S.STEP_NETTOYAGE_1)
  })

  test('cleanser with oil pos 2 (water-based hybrid) → step-nettoyage-1', () => {
    expect(
      detectStepNettoyage1(
        'Aqua, Caprylic/Capric Triglyceride, Glycerin, Polysorbate 20',
        'cleanser'
      )
    ).toContain(S.STEP_NETTOYAGE_1)
  })

  test('foaming gel cleanser (SLS top 5) → not flagged', () => {
    expect(
      detectStepNettoyage1(
        'Aqua, Caprylic/Capric Triglyceride, Glycerin, Sodium Lauryl Sulfate, Cocamidopropyl Betaine',
        'cleanser'
      )
    ).toEqual([])
  })

  test('SLES variant in top 5 → not flagged', () => {
    expect(
      detectStepNettoyage1(
        'Aqua, Caprylic/Capric Triglyceride, Sodium Laureth Sulfate, Glycerin, Cocamide DEA',
        'cleanser'
      )
    ).toEqual([])
  })

  test('cleanser without oil in top 3 → not flagged', () => {
    expect(
      detectStepNettoyage1(
        'Aqua, Glycerin, Cocamidopropyl Betaine, Decyl Glucoside, Caprylic/Capric Triglyceride',
        'cleanser'
      )
    ).toEqual([])
  })

  test('non-cleanser kind (moisturizer) → not flagged', () => {
    expect(
      detectStepNettoyage1('Caprylic/Capric Triglyceride, Glycerin, Aqua', 'moisturizer')
    ).toEqual([])
  })

  test('null/empty INCI → []', () => {
    expect(detectStepNettoyage1(null, 'cleanser')).toEqual([])
    expect(detectStepNettoyage1('', 'cleanser')).toEqual([])
  })
})

describe('detectCernesPoches', () => {
  test('eye-cream + caffeine → cernes-poches', () => {
    expect(detectCernesPoches('Aqua, Glycerin, Caffeine, Niacinamide', 'eye-cream')).toContain(
      S.CERNES_POCHES
    )
  })

  test('eye-cream + peptide pattern → cernes-poches', () => {
    expect(
      detectCernesPoches('Aqua, Glycerin, Acetyl Hexapeptide-8, Tocopherol', 'eye-cream')
    ).toContain(S.CERNES_POCHES)
  })

  test('eye-cream + matrixyl → cernes-poches', () => {
    expect(detectCernesPoches('Aqua, Glycerin, Matrixyl 3000', 'eye-cream')).toContain(
      S.CERNES_POCHES
    )
  })

  test('caffeine in serum (not eye-cream) → not flagged', () => {
    expect(detectCernesPoches('Aqua, Glycerin, Caffeine, Niacinamide', 'serum')).toEqual([])
  })

  test('caffeine past position 12 → not flagged', () => {
    const filler = Array.from({ length: 12 }, (_, i) => `Filler${i + 1}`).join(', ')
    expect(detectCernesPoches(`Aqua, ${filler}, Caffeine`, 'eye-cream')).toEqual([])
  })

  test('eye-cream without caffeine/peptides → not flagged', () => {
    expect(detectCernesPoches('Aqua, Glycerin, Niacinamide, Hyaluronic Acid', 'eye-cream')).toEqual(
      []
    )
  })

  test('null/empty INCI → []', () => {
    expect(detectCernesPoches(null, 'eye-cream')).toEqual([])
    expect(detectCernesPoches('', 'eye-cream')).toEqual([])
  })
})

describe('detectKeratosePilaire', () => {
  test('urea in top 8 + body-lotion → keratose-pilaire', () => {
    expect(detectKeratosePilaire('Aqua, Urea, Glycerin, Petrolatum', 'body-lotion')).toContain(
      S.KERATOSE_PILAIRE
    )
  })

  test('urea + body-oil → keratose-pilaire', () => {
    expect(detectKeratosePilaire('Caprylic/Capric Triglyceride, Urea', 'body-oil')).toContain(
      S.KERATOSE_PILAIRE
    )
  })

  test('urea past position 8 (humectant trace) → not flagged', () => {
    const filler = Array.from({ length: 8 }, (_, i) => `Filler${i + 1}`).join(', ')
    expect(detectKeratosePilaire(`Aqua, ${filler}, Urea`, 'body-lotion')).toEqual([])
  })

  test('lactic acid + ammonium lactate combo → keratose-pilaire (AmLactin pattern)', () => {
    expect(
      detectKeratosePilaire('Aqua, Ammonium Lactate, Lactic Acid, Glycerin', 'body-lotion')
    ).toContain(S.KERATOSE_PILAIRE)
  })

  test('lactic acid alone (no ammonium lactate) → not flagged (pH adjuster vs buffered)', () => {
    expect(detectKeratosePilaire('Aqua, Glycerin, Lactic Acid, Petrolatum', 'body-lotion')).toEqual(
      []
    )
  })

  test('urea in non-eligible kind (body-wash) → not flagged (rinse-off)', () => {
    expect(detectKeratosePilaire('Aqua, Urea, Sodium Laureth Sulfate', 'body-wash')).toEqual([])
  })

  test('urea in hand-cream → not flagged (different concern domain)', () => {
    expect(detectKeratosePilaire('Aqua, Urea, Glycerin', 'hand-cream')).toEqual([])
  })

  test('urea in face moisturizer → not flagged (not body kind)', () => {
    expect(detectKeratosePilaire('Aqua, Urea, Glycerin', 'moisturizer')).toEqual([])
  })

  test('null/empty INCI → []', () => {
    expect(detectKeratosePilaire(null, 'body-lotion')).toEqual([])
    expect(detectKeratosePilaire('', 'body-lotion')).toEqual([])
  })
})

describe('detectReparationCutanee', () => {
  test('panthenol in top 12 → reparation-cutanee', () => {
    expect(detectReparationCutanee('Aqua, Glycerin, Panthenol')).toContain(S.REPARATION)
  })

  test('allantoin → reparation-cutanee', () => {
    expect(detectReparationCutanee('Aqua, Allantoin, Glycerin')).toContain(S.REPARATION)
  })

  test('centella asiatica extract → reparation-cutanee', () => {
    expect(detectReparationCutanee('Aqua, Glycerin, Centella Asiatica Leaf Extract')).toContain(
      S.REPARATION
    )
  })

  test('madecassoside (centella isolate) → reparation-cutanee', () => {
    expect(detectReparationCutanee('Aqua, Madecassoside, Glycerin')).toContain(S.REPARATION)
  })

  test('bisabolol → reparation-cutanee', () => {
    expect(detectReparationCutanee('Aqua, Glycerin, Bisabolol')).toContain(S.REPARATION)
  })

  test('actif past position 12 (texture polish trace) → not flagged', () => {
    const filler = Array.from({ length: 12 }, (_, i) => `Filler${i + 1}`).join(', ')
    expect(detectReparationCutanee(`Aqua, ${filler}, Panthenol`)).toEqual([])
  })

  test('clean INCI without repair actifs → not flagged', () => {
    expect(detectReparationCutanee('Aqua, Glycerin, Niacinamide, Hyaluronic Acid')).toEqual([])
  })

  test('null/empty INCI → []', () => {
    expect(detectReparationCutanee(null)).toEqual([])
    expect(detectReparationCutanee('')).toEqual([])
  })
})

describe('detectProtection', () => {
  test('sunscreen kind fires regardless of name/desc', () => {
    expect(detectProtection('sunscreen', null, null)).toEqual([S.PROTECTION])
  })
  test('SPF stated in name fires on a non-sunscreen kind (tinted/day cream)', () => {
    expect(detectProtection('moisturizer', 'Crème Jour SPF 30', null)).toEqual([S.PROTECTION])
  })
  test('SPF stated in description fires', () => {
    expect(detectProtection('moisturizer', 'Crème teintée', 'Protection SPF50+ PA++++')).toEqual([
      S.PROTECTION,
    ])
  })
  test('French FPS variant fires', () => {
    expect(detectProtection('moisturizer', 'Soin solaire FPS 50', null)).toEqual([S.PROTECTION])
  })
  test('SPF with a non-space separator fires (hyphen, colon, dot)', () => {
    expect(detectProtection('moisturizer', 'Crème SPF-30', null)).toEqual([S.PROTECTION])
    expect(detectProtection('moisturizer', null, 'Protection SPF:50')).toEqual([S.PROTECTION])
    expect(detectProtection('moisturizer', 'Fluide spf.50', null)).toEqual([S.PROTECTION])
  })
  test('looser separator class still requires a digit (spf without index stays absent)', () => {
    expect(detectProtection('moisturizer', 'Crème spf sans indice', null)).toEqual([])
  })
  test('non-sunscreen kind with no SPF does not fire', () => {
    expect(detectProtection('serum', 'Sérum éclat vitamine C', 'Antioxydant')).toEqual([])
  })
  // Rule E: post-exposure ≠ protection. after-sun / self-tanner without SPF stay absent
  // (they are not `sunscreen`); an SPF claim would still win via the SPF branch.
  test('after-sun without SPF does not fire', () => {
    expect(detectProtection('after-sun', 'Après-soleil réparateur', null)).toEqual([])
  })
  test('self-tanner without SPF does not fire', () => {
    expect(detectProtection('self-tanner', 'Autobronzant progressif', null)).toEqual([])
  })
})

describe('detectRougeursVasculairesFromName', () => {
  const RV = [S.ROUGEURS_VASCULAIRES]
  test('fires when name names redness', () => {
    expect(detectRougeursVasculairesFromName('Crème Anti-Rougeurs Rosakalm', null)).toEqual(RV)
  })
  test('fires on "rosacée"', () => {
    expect(detectRougeursVasculairesFromName('Soin Rosacée', null)).toEqual(RV)
  })
  test('fires on English "redness" in description (recall path)', () => {
    expect(detectRougeursVasculairesFromName('Cica Serum', 'targets facial redness')).toEqual(RV)
  })
  // Camouflage makeup masks redness optically, it does not target the concern.
  test('does not fire on a color-correcting CC treatment', () => {
    expect(
      detectRougeursVasculairesFromName('Color Correcting Treatment', 'corrige les rougeurs')
    ).toEqual([])
  })
  test('does not fire on a green primer that blurs redness', () => {
    expect(
      detectRougeursVasculairesFromName('Primer Vert', 'estompe les rougeurs visibles')
    ).toEqual([])
  })
  // Recall-safe regression: a tinted *anti-redness* care keeps `teinté` — it must
  // NOT be swept into the camouflage exclusion (Sensifine AR / Roséliane).
  test('fires on a tinted anti-redness care (teinté not a camouflage token)', () => {
    expect(detectRougeursVasculairesFromName('Soin Teinté Anti-Rougeurs SPF50', null)).toEqual(RV)
  })
  // Regression: a treatment whose copy says "les rougeurs s'estompent" (redness
  // fades) is anti-redness positioning, not camouflage — `estompe` must not exclude it.
  test('fires on an anti-redness treatment that says rougeurs s’estompent', () => {
    expect(
      detectRougeursVasculairesFromName(
        'Redness Solutions Crème Anti-Rougeurs',
        'réduit les rougeurs ; jour après jour, les rougeurs s’estompent'
      )
    ).toEqual(RV)
  })
  test('does not fire on a generic soothing product (no redness positioning)', () => {
    expect(
      detectRougeursVasculairesFromName('Crème Apaisante au Panthénol', 'Pour peaux sensibles')
    ).toEqual([])
  })
  test('does not fire on empty name/desc', () => {
    expect(detectRougeursVasculairesFromName(null, null)).toEqual([])
  })
})

describe('detectHyperpigmentationFromName', () => {
  const HP = [S.HYPERPIGMENTATION]
  test('fires on "anti-taches"', () => {
    expect(detectHyperpigmentationFromName('Sérum Anti-Taches', null)).toEqual(HP)
  })
  test('fires on English "dark spot"', () => {
    expect(detectHyperpigmentationFromName('Dark Spot Corrector', null)).toEqual(HP)
  })
  // Generic radiance vocabulary belongs to eclat-teint-uniforme, not here.
  test('does not fire on a generic radiance claim', () => {
    expect(detectHyperpigmentationFromName('Sérum Éclaircissant Éclat', null)).toEqual([])
  })
  test('excludes an incidental pigment mention on a cleanser', () => {
    expect(detectHyperpigmentationFromName('Gel Nettoyant', 'estompe les taches brunes')).toEqual(
      []
    )
  })
  test('does not fire on empty name/desc', () => {
    expect(detectHyperpigmentationFromName(null, null)).toEqual([])
  })
})

describe('detectEclatTeintFromName', () => {
  const ET = [S.ECLAT_TEINT]
  test('fires on "teint terne"', () => {
    expect(detectEclatTeintFromName('Soin Anti Teint Terne', null)).toEqual(ET)
  })
  test('fires on "unifie le teint"', () => {
    expect(detectEclatTeintFromName('Sérum qui unifie le teint', null)).toEqual(ET)
  })
  // Same radiance vocabulary, but an eye product is excluded.
  test('excludes an eye-area product', () => {
    expect(detectEclatTeintFromName('Contour des Yeux Illuminateur', null)).toEqual([])
  })
  test('does not fire on empty name/desc', () => {
    expect(detectEclatTeintFromName(null, null)).toEqual([])
  })
})

describe('detectPoresSebumFromName', () => {
  const PS = [S.PORES_SEBUM]
  test('fires on "pores"', () => {
    expect(detectPoresSebumFromName('Sérum Resserre les Pores', null)).toEqual(PS)
  })
  test('fires on "matifiant" / "peaux grasses"', () => {
    expect(detectPoresSebumFromName('Fluide Matifiant', 'pour peaux grasses')).toEqual(PS)
  })
  test('does not fire on a generic moisturizer', () => {
    expect(detectPoresSebumFromName('Crème Nourrissante', 'pour peaux sèches')).toEqual([])
  })
  test('does not fire on empty name/desc', () => {
    expect(detectPoresSebumFromName(null, null)).toEqual([])
  })
})

describe('detectDeshydratationFromName', () => {
  const DH = [S.DESHYDRATATION]
  test('fires on "déshydratation"', () => {
    expect(detectDeshydratationFromName('Sérum Anti-Déshydratation', null)).toEqual(DH)
  })
  test('fires when hydration is the named hero (acide hyaluronique)', () => {
    expect(detectDeshydratationFromName('Sérum à l’Acide Hyaluronique', null)).toEqual(DH)
  })
  // SPF sunscreens name hydration incidentally — excluded (recall-safe).
  test('excludes an SPF sunscreen that mentions hydration', () => {
    expect(detectDeshydratationFromName('Fluide Hydratant SPF50', null)).toEqual([])
  })
  test('does not fire without hydration vocabulary', () => {
    expect(detectDeshydratationFromName('Gel Nettoyant Purifiant', 'mousse douce')).toEqual([])
  })
  test('does not fire on empty name/desc', () => {
    expect(detectDeshydratationFromName(null, null)).toEqual([])
  })
})

describe('detectAcneImperfectionsFromName', () => {
  const AI = [S.ACNE_IMPERFECTIONS]
  test('fires on "acné"', () => {
    expect(detectAcneImperfectionsFromName('Soin Anti-Acné', null)).toEqual(AI)
  })
  test('fires on "imperfections"', () => {
    expect(detectAcneImperfectionsFromName('Crème Anti-Imperfections', null)).toEqual(AI)
  })
  test('fires on English "blemish"', () => {
    expect(detectAcneImperfectionsFromName('Anti-Blemish Solution', null)).toEqual(AI)
  })
  // "blemish" on a brightening product means pigment spot, not acne — excluded via `eclair`.
  test('excludes a brightening "blemish" product', () => {
    expect(
      detectAcneImperfectionsFromName('Green Lemon Vita C Blemish Mask', 'effet eclaircissant')
    ).toEqual([])
  })
  // Accented form: FR copy writes "éclaircissant" — the exclusion must match it too,
  // else an "imperfections" trigger leaks a false acne tag (regex has no `u`/accent fold).
  test('excludes an accented "éclaircissant" brightening product', () => {
    expect(
      detectAcneImperfectionsFromName('Sérum Éclaircissant', 'réduit les taches et imperfections')
    ).toEqual([])
  })
  // "acné fongique" is a safety qualifier (a caution), not a target claim.
  test('excludes an "acné fongique" qualifier', () => {
    expect(
      detectAcneImperfectionsFromName('Crème Hydratante', 'déconseillé en cas d’acné fongique')
    ).toEqual([])
  })
  test('does not fire on empty name/desc', () => {
    expect(detectAcneImperfectionsFromName(null, null)).toEqual([])
  })
})

describe('detectAntiAgeFromName', () => {
  const AA = [S.ANTI_AGE]
  test('fires on "anti-âge"', () => {
    expect(detectAntiAgeFromName('Crème Anti-Âge', null)).toEqual(AA)
  })
  test('fires on the retinoid family (rétinol)', () => {
    expect(detectAntiAgeFromName('Sérum Rétinol 0.3%', null)).toEqual(AA)
  })
  test('fires on "bakuchiol" (declared retinol alternative)', () => {
    expect(detectAntiAgeFromName('Bakuchiol Booster', null)).toEqual(AA)
  })
  test('fires on English "wrinkle"', () => {
    expect(detectAntiAgeFromName('Wrinkle Smoothing Serum', null)).toEqual(AA)
  })
  // Regression: `\baging\b` must not match "packaging".
  test('does not fire on "packaging" (no anti-age positioning)', () => {
    expect(detectAntiAgeFromName('Gel Nettoyant', 'recyclable packaging, eco-friendly')).toEqual([])
  })
  test('does not fire on empty name/desc', () => {
    expect(detectAntiAgeFromName(null, null)).toEqual([])
  })
})

describe('detectBarriereCutaneeFromName', () => {
  const BC = [S.BARRIERE_CUTANEE]
  test('fires on "réparateur" (French dermo category name)', () => {
    expect(detectBarriereCutaneeFromName('Baume Réparateur', null)).toEqual(BC)
  })
  test('fires on English "skin barrier"', () => {
    expect(detectBarriereCutaneeFromName('Skin Barrier Repair Cream', null)).toEqual(BC)
  })
  // Acne lines reuse "réparateur" — excluded (recall-safe).
  test('excludes an acne-line "soin réparateur" (effaclar)', () => {
    expect(detectBarriereCutaneeFromName('Effaclar H Soin Réparateur', null)).toEqual([])
  })
  // Anti-aging "repair" = cell turnover, not barrier — excluded.
  test('excludes an anti-age "repair" serum', () => {
    expect(detectBarriereCutaneeFromName('Night Repair Serum Anti-Âge', null)).toEqual([])
  })
  test('does not fire on empty name/desc', () => {
    expect(detectBarriereCutaneeFromName(null, null)).toEqual([])
  })
})

describe('detectApaisantFromName', () => {
  const AP = [S.APAISANT]
  test('fires when soothing is the product hero ("crème apaisante")', () => {
    expect(detectApaisantFromName('Crème Apaisante', null)).toEqual(AP)
  })
  test('fires on English "soothing serum"', () => {
    expect(detectApaisantFromName('Soothing Recovery Serum', null)).toEqual(AP)
  })
  test('fires on anti-redness positioning ("anti-rougeurs")', () => {
    expect(detectApaisantFromName('Soin Anti-Rougeurs', null)).toEqual(AP)
  })
  // Foaming cleanser that mentions a soothing effect — excluded (gel moussant).
  test('excludes a foaming cleanser ("gel moussant")', () => {
    expect(
      detectApaisantFromName('Gel Moussant Nettoyant', 'nettoie en douceur, effet apaisant')
    ).toEqual([])
  })
  test('does not fire without soothing positioning', () => {
    expect(detectApaisantFromName('Sérum Vitamine C', 'éclat et fermeté')).toEqual([])
  })
  test('does not fire on empty name/desc', () => {
    expect(detectApaisantFromName(null, null)).toEqual([])
  })
})

describe('detectEczemaAtopieFromName', () => {
  test('fires when name names atopy', () => {
    expect(detectEczemaAtopieFromName('Baume Émollient Atopie', null)).toEqual([S.ECZEMA_ATOPIE])
  })
  test('fires on "peau atopique"', () => {
    expect(detectEczemaAtopieFromName('Soin peau atopique', null)).toEqual([S.ECZEMA_ATOPIE])
  })
  test('fires when description names eczéma', () => {
    expect(
      detectEczemaAtopieFromName('Crème relipidante', 'Apaise les démangeaisons liées à l’eczéma')
    ).toEqual([S.ECZEMA_ATOPIE])
  })
  test('fires on English "eczema"', () => {
    expect(detectEczemaAtopieFromName('Eczema Relief Cream', null)).toEqual([S.ECZEMA_ATOPIE])
  })
  // Safe tokens only — broad brand lines (Lipikar etc.) deliberately not matched.
  test('does not fire on a generic moisturizer', () => {
    expect(
      detectEczemaAtopieFromName('Crème hydratante nourrissante', 'Pour peaux sèches')
    ).toEqual([])
  })
  test('does not fire on empty name/desc', () => {
    expect(detectEczemaAtopieFromName(null, null)).toEqual([])
  })

  // Non-regression: real description-only positives — products tagged purely on
  // description, name not matching. Deleting the description branch regresses every
  // one. None of these names contain "atopi"/"eczéma" (Atoderm has no "p"), so a
  // pass here can only come from the description field.
  test.each([
    [
      'Crème pour le Visage',
      'Soin quotidien hydratant pour peaux très sèches, sensibles, atopiques ou fragilisées par traitements anticancéreux.',
    ],
    [
      'Gelée Fondante Démaquillante',
      'Double transformation. Haute tolérance pour peaux sensibles, atopiques ou fragilisées.',
    ],
    [
      'Essence Toner',
      "Issu d'un établissement bien connu pour traiter les troubles cutanés atopiques.",
    ],
    [
      'Atobarrier 365 Body Lotion',
      "Idéale pour les peaux sensibles, sujettes à l'eczéma ou facilement irritables.",
    ],
    ['Atoderm Intensive Baume', 'Baume relipidant intensif pour peaux très sèches à atopiques.'],
    [
      'Crème Céramide Protection',
      'Crème renforçante barrière sans parfum pour peaux atopiques/sensibles.',
    ],
    [
      'Creme Hydratante Anti Irritations',
      'Protège, répare et apaise les peaux extra-sèches, irritées ou atopiques du corps.',
    ],
    [
      'Crème Panthénol Confort',
      'Crème apaisante sans parfum pour peaux réactives/irritées. Soulage eczéma/psoriasis léger.',
    ],
    [
      'Dexyane Med Soothing Repair Cream',
      'Crème apaisante qui restaure la barrière cutanée des peaux atopiques sujettes aux démangeaisons.',
    ],
    [
      'La Roche-Posay Lipikar Huile Lavante Ap+',
      "Relipide et apaise les peaux extrêmement sèches à tendance à l'eczéma atopique.",
    ],
  ])('description-only positive: %s', (name, description) => {
    expect(detectEczemaAtopieFromName(name, description)).toEqual([S.ECZEMA_ATOPIE])
  })

  // known-gap: a description that contraindicates atopy still fires today —
  // detectEczemaAtopieFromName reads the token, not the negation around it. This
  // asserts the WRONG result on purpose. When negation handling lands (the regex
  // gains contraindication awareness), this flips to toEqual([]); that flip is the
  // signal the gap closed. Do NOT "fix" this test in isolation — the live guard is
  // eczemaAtopieDescriptionNeedsReview in the ingest pipeline.
  test('known-gap: contraindicating description false-positives (documents the gap)', () => {
    expect(detectEczemaAtopieFromName(null, 'Crème déconseillée aux peaux atopiques')).toEqual([
      S.ECZEMA_ATOPIE,
    ])
  })
})

describe('eczemaAtopieDescriptionNeedsReview', () => {
  test('flags contraindication + atopy → manual review', () => {
    expect(eczemaAtopieDescriptionNeedsReview('Crème déconseillée aux peaux atopiques')).toBe(true)
  })
  test('flags "non recommandé sur peaux atopiques"', () => {
    expect(
      eczemaAtopieDescriptionNeedsReview(
        'Actif puissant, non recommandé sur peaux atopiques sans test préalable'
      )
    ).toBe(true)
  })
  test('does not flag positive positioning (preserves recall)', () => {
    expect(eczemaAtopieDescriptionNeedsReview('Soin pour peaux à tendance atopique')).toBe(false)
  })
  test('does not flag eczéma/psoriasis co-indication (positive claim)', () => {
    expect(eczemaAtopieDescriptionNeedsReview('Soulage eczéma/psoriasis léger')).toBe(false)
  })
  test('does not flag contraindication without atopy', () => {
    expect(eczemaAtopieDescriptionNeedsReview('Ne pas utiliser sur peau lésée ou brûlée')).toBe(
      false
    )
  })
  test('does not flag null', () => {
    expect(eczemaAtopieDescriptionNeedsReview(null)).toBe(false)
  })
  test('does not flag undefined or empty string', () => {
    expect(eczemaAtopieDescriptionNeedsReview(undefined)).toBe(false)
    expect(eczemaAtopieDescriptionNeedsReview('')).toBe(false)
  })
  // Proximity: a boilerplate caveat in a separate sentence from a positive atopy
  // claim is not a contraindication of atopy — must not trip the sentinel.
  test('does not flag a positive atopy claim with an unrelated caveat in another sentence', () => {
    expect(
      eczemaAtopieDescriptionNeedsReview('Soin pour peaux atopiques. Éviter le contour des yeux.')
    ).toBe(false)
    expect(
      eczemaAtopieDescriptionNeedsReview('Crème atopique. Ne pas appliquer sur plaie ouverte.')
    ).toBe(false)
    expect(
      eczemaAtopieDescriptionNeedsReview('Baume atopie. Déconseillé pendant la grossesse.')
    ).toBe(false)
  })
  test('flags when contraindication and atopy share a sentence even across a comma', () => {
    expect(eczemaAtopieDescriptionNeedsReview('Déconseillé, notamment aux peaux atopiques')).toBe(
      true
    )
  })
})

describe('partitionEczemaReview', () => {
  const eczema = { tagSlug: S.ECZEMA_ATOPIE, relevance: 'secondary' as const }
  const other = { tagSlug: S.PROTECTION, relevance: 'secondary' as const }

  test('withholds the eczema-atopie pair on a contraindicating description', () => {
    const { kept, withheld } = partitionEczemaReview(
      [eczema, other],
      'Crème déconseillée aux peaux atopiques'
    )
    expect(withheld).toBe(true)
    expect(kept).toEqual([other])
  })
  test('keeps the eczema-atopie pair on a positive description', () => {
    const { kept, withheld } = partitionEczemaReview(
      [eczema, other],
      'Soin pour peaux à tendance atopique'
    )
    expect(withheld).toBe(false)
    expect(kept).toEqual([eczema, other])
  })
  test('no eczema-atopie pair → never withholds even under contraindication', () => {
    const { kept, withheld } = partitionEczemaReview(
      [other],
      'Crème déconseillée aux peaux atopiques'
    )
    expect(withheld).toBe(false)
    expect(kept).toEqual([other])
  })
})

describe('detectRepulpant', () => {
  test('HA top 3 + glycerin top 5 + acetyl hexapeptide-8 → repulpant', () => {
    expect(
      detectRepulpant(
        'Aqua, Sodium Hyaluronate, Glycerin, Pentylene Glycol, Niacinamide, Acetyl Hexapeptide-8',
        'serum'
      )
    ).toContain(S.REPULPANT)
  })

  test('HA top 3 + glycerin top 5 + palmitoyl tripeptide-1 → repulpant', () => {
    expect(
      detectRepulpant(
        'Aqua, Hyaluronic Acid, Glycerin, Pentylene Glycol, Palmitoyl Tripeptide-1',
        'serum'
      )
    ).toContain(S.REPULPANT)
  })

  test('HA at pos 7 (Matrixyl-style, peptide as headline actif) → repulpant', () => {
    expect(
      detectRepulpant(
        'Water, Glycerin, Butylene Glycol, Palmitoyl Tripeptide-1, Palmitoyl Tetrapeptide-7, Palmitoyl Tripeptide-38, Sodium Hyaluronate',
        'serum'
      )
    ).toContain(S.REPULPANT)
  })

  test('HA past position 8 (trace dosing) → not flagged', () => {
    const filler = Array.from({ length: 8 }, (_, i) => `Filler${i + 1}`).join(', ')
    expect(
      detectRepulpant(
        `Aqua, Glycerin, ${filler}, Sodium Hyaluronate, Acetyl Hexapeptide-8`,
        'serum'
      )
    ).toEqual([])
  })

  test('glycerin past position 5 → not flagged (humectant trace)', () => {
    const filler = Array.from({ length: 5 }, (_, i) => `Filler${i + 1}`).join(', ')
    expect(
      detectRepulpant(
        `Aqua, Sodium Hyaluronate, Niacinamide, ${filler}, Glycerin, Acetyl Hexapeptide-8`,
        'serum'
      )
    ).toEqual([])
  })

  test('no plumping peptide → not flagged (HA + glycerin alone = generic hydrator)', () => {
    expect(
      detectRepulpant('Aqua, Sodium Hyaluronate, Glycerin, Pentylene Glycol, Niacinamide', 'serum')
    ).toEqual([])
  })

  test('glyceryl stearate (not pure glycerin) does not satisfy glycerin requirement', () => {
    expect(
      detectRepulpant(
        'Aqua, Sodium Hyaluronate, Glyceryl Stearate, Niacinamide, Acetyl Hexapeptide-8',
        'serum'
      )
    ).toEqual([])
  })

  test('cleanser (rinse-off) → not flagged (leave-on only)', () => {
    expect(
      detectRepulpant(
        'Aqua, Sodium Hyaluronate, Glycerin, Pentylene Glycol, Acetyl Hexapeptide-8',
        'cleanser'
      )
    ).toEqual([])
  })

  test('null/empty INCI → []', () => {
    expect(detectRepulpant(null, 'serum')).toEqual([])
    expect(detectRepulpant('', 'serum')).toEqual([])
  })
})

// T1.1 — fini-mat / matifiant
describe('detectFiniMat', () => {
  test('silica in top 8 → fini-mat + matifiant', () => {
    const tags = detectFiniMat('Aqua, Glycerin, Silica, Niacinamide')
    expect(tags).toContain(S.FINI_MAT)
    expect(tags).toContain(S.MATIFIANT)
  })

  test('kaolin → emits both', () => {
    const tags = detectFiniMat('Aqua, Kaolin, Glycerin')
    expect(tags).toContain(S.FINI_MAT)
    expect(tags).toContain(S.MATIFIANT)
  })

  test('corn starch → flagged', () => {
    expect(detectFiniMat('Aqua, Glycerin, Zea Mays Starch')).toContain(S.FINI_MAT)
  })

  test('absorbent past position 8 (texture polish trace) → not flagged', () => {
    const filler = Array.from({ length: 8 }, (_, i) => `Filler${i + 1}`).join(', ')
    expect(detectFiniMat(`Aqua, ${filler}, Silica`)).toEqual([])
  })

  test('null/empty INCI → []', () => {
    expect(detectFiniMat(null)).toEqual([])
    expect(detectFiniMat('')).toEqual([])
  })
})

// T1.2 — texture-riche
describe('detectTextureRiche', () => {
  test('shea + cocoa butter top 8 → texture-riche', () => {
    expect(
      detectTextureRiche('Aqua, Butyrospermum Parkii Butter, Theobroma Cacao Seed Butter, Glycerin')
    ).toContain(S.TEXTURE_RICHE)
  })

  test('shea butter alone → not flagged (one butter is just polish)', () => {
    expect(detectTextureRiche('Aqua, Glycerin, Butyrospermum Parkii Butter, Niacinamide')).toEqual(
      []
    )
  })

  test('shea + beeswax → texture-riche', () => {
    expect(detectTextureRiche('Aqua, Butyrospermum Parkii Butter, Cera Alba, Glycerin')).toContain(
      S.TEXTURE_RICHE
    )
  })

  test('shea synonyms (parkii + shea butter same ingredient) ≠ 2 butters', () => {
    // Same ingredient listed once with both substrings — should count as 1 group
    expect(
      detectTextureRiche('Aqua, Butyrospermum Parkii (Shea Butter), Glycerin, Niacinamide')
    ).toEqual([])
  })

  test('butters past position 8 → not flagged', () => {
    const filler = Array.from({ length: 8 }, (_, i) => `Filler${i + 1}`).join(', ')
    expect(
      detectTextureRiche(`Aqua, ${filler}, Butyrospermum Parkii Butter, Theobroma Cacao Butter`)
    ).toEqual([])
  })

  test('euphorbia cerifera (candelilla wax INCI name) + shea → texture-riche', () => {
    expect(
      detectTextureRiche(
        'Polyglyceryl-2 Triisostearate, Octyldodecanol, Beurre de Butyrospermum Parkii, Cire d Euphorbia Cerifera, Huile Coco'
      )
    ).toContain(S.TEXTURE_RICHE)
  })

  test('null/empty INCI → []', () => {
    expect(detectTextureRiche(null)).toEqual([])
  })
})

// T1.3 — texture-legere
describe('detectTextureLegere', () => {
  test('aqua top 1 + no butter → texture-legere on serum', () => {
    expect(detectTextureLegere('Aqua, Glycerin, Niacinamide, Hyaluronic Acid', 'serum')).toContain(
      S.TEXTURE_LEGERE
    )
  })

  test('water-based moisturizer with petrolatum top 8 → not flagged', () => {
    expect(detectTextureLegere('Aqua, Glycerin, Petrolatum, Niacinamide', 'moisturizer')).toEqual(
      []
    )
  })

  test('shea butter top 5 → not flagged', () => {
    expect(
      detectTextureLegere(
        'Aqua, Glycerin, Caprylic/Capric Triglyceride, Butyrospermum Parkii Butter, Niacinamide',
        'moisturizer'
      )
    ).toEqual([])
  })

  test('soybean oil top 6 → not flagged (glycine soja in HEAVY_EXCLUSION)', () => {
    expect(
      detectTextureLegere(
        'Water, Pentylene Glycol, Polyglyceryl-10 Stearate, Caprylic/Capric Triglyceride, Diglycerin, Glycine Soja Oil, Undecane, Panthenol',
        'serum'
      )
    ).toEqual([])
  })

  test('apricot kernel oil top 7 → not flagged (prunus armeniaca in HEAVY_EXCLUSION)', () => {
    expect(
      detectTextureLegere(
        'Aqua, Caprylic/Capric Triglyceride, Propanediol, Cetearyl Alcohol, Glycerin, Panthenol, Prunus Armeniaca Kernel Oil, Cetearyl Olivate',
        'moisturizer'
      )
    ).toEqual([])
  })

  test('cleanser → never flagged (rinse-off)', () => {
    expect(detectTextureLegere('Aqua, Glycerin, Niacinamide', 'cleanser')).toEqual([])
  })

  test('body-wash → never flagged', () => {
    expect(detectTextureLegere('Aqua, Glycerin, Niacinamide', 'body-wash')).toEqual([])
  })

  test('balm → never flagged (inherently rich)', () => {
    expect(detectTextureLegere('Aqua, Glycerin, Niacinamide', 'balm')).toEqual([])
  })

  test('serum with glycerin top 1, no aqua → flagged via glycerin', () => {
    expect(
      detectTextureLegere('Glycerin, Propanediol, Niacinamide, Tocopherol', 'serum')
    ).toContain(S.TEXTURE_LEGERE)
  })

  test('null/empty INCI → []', () => {
    expect(detectTextureLegere(null, 'serum')).toEqual([])
    expect(detectTextureLegere('', 'serum')).toEqual([])
  })
})

// T1.5 — non-gras (silicone-led light formula)
describe('detectNonGras', () => {
  test('serum + dimethicone top 5 + no oil → non-gras', () => {
    const tags = detectNonGras('Aqua, Glycerin, Dimethicone, Niacinamide, Tocopherol', 'serum')
    expect(tags).toContain(S.NON_GRAS)
  })

  test('eye-cream + cyclopentasiloxane → non-gras', () => {
    const tags = detectNonGras('Aqua, Cyclopentasiloxane, Glycerin, Caffeine', 'eye-cream')
    expect(tags).toContain(S.NON_GRAS)
  })

  test('serum + dimethicone + jojoba oil top 5 → not flagged', () => {
    expect(
      detectNonGras(
        'Aqua, Glycerin, Dimethicone, Simmondsia Chinensis Seed Oil, Niacinamide',
        'serum'
      )
    ).toEqual([])
  })

  test('moisturizer (not in eligible kinds) → not flagged', () => {
    expect(detectNonGras('Aqua, Dimethicone, Glycerin, Niacinamide', 'moisturizer')).toEqual([])
  })

  test('serum without any silicone top 5 → not flagged', () => {
    expect(
      detectNonGras('Aqua, Glycerin, Niacinamide, Hyaluronic Acid, Tocopherol', 'serum')
    ).toEqual([])
  })

  test('null INCI → []', () => {
    expect(detectNonGras(null, 'serum')).toEqual([])
  })
})

// T1.6 — pigments-verts
describe('detectPigmentsVerts', () => {
  test('CI 77288 → pigments-verts', () => {
    expect(detectPigmentsVerts('Aqua, Glycerin, CI 77288')).toContain(S.PIGMENTS_VERTS)
  })

  test('no-space variant CI77288 → flagged', () => {
    expect(detectPigmentsVerts('Aqua, Glycerin, CI77288')).toContain(S.PIGMENTS_VERTS)
  })

  test('chromium oxide green spelled out → flagged', () => {
    expect(detectPigmentsVerts('Aqua, Glycerin, Chromium Oxide Green')).toContain(S.PIGMENTS_VERTS)
  })

  test('clean INCI without green pigment → not flagged', () => {
    expect(detectPigmentsVerts('Aqua, Glycerin, Niacinamide, Centella Asiatica')).toEqual([])
  })

  test('null/empty INCI → []', () => {
    expect(detectPigmentsVerts(null)).toEqual([])
  })
})

// T1.7 vegan → migrated to algo-derm (TAG_DEFS v7)
// detectVegan tests removed. Logic tested via detectAutoTags in
// algo-derm-detection.test.ts.

// T1.8 — peau-normale heuristic
describe('detectPeauNormale', () => {
  test('moisturizer + clean INCI + no other skin_type → peau-normale', () => {
    expect(
      detectPeauNormale(
        'Aqua, Glycerin, Cetyl Alcohol, Niacinamide, Panthenol, Tocopherol',
        'moisturizer',
        new Set<string>()
      )
    ).toContain(S.PEAU_NORMALE)
  })

  test('peau-grasse already proposed → abstain', () => {
    expect(
      detectPeauNormale(
        'Aqua, Glycerin, Cetyl Alcohol, Niacinamide, Panthenol, Tocopherol',
        'moisturizer',
        new Set([S.PEAU_GRASSE])
      )
    ).toEqual([])
  })

  test('peau-sensible already proposed → abstain', () => {
    expect(
      detectPeauNormale(
        'Aqua, Glycerin, Cetyl Alcohol, Niacinamide, Panthenol, Tocopherol',
        'moisturizer',
        new Set([S.PEAU_SENSIBLE])
      )
    ).toEqual([])
  })

  test('strong actif (retinol) → abstain', () => {
    expect(
      detectPeauNormale(
        'Aqua, Glycerin, Retinol, Niacinamide, Panthenol, Tocopherol',
        'serum',
        new Set<string>()
      )
    ).toEqual([])
  })

  test('AHA → abstain', () => {
    expect(
      detectPeauNormale(
        'Aqua, Glycerin, Glycolic Acid, Niacinamide, Panthenol, Tocopherol',
        'moisturizer',
        new Set<string>()
      )
    ).toEqual([])
  })

  test('non-eligible kind (serum) → abstain', () => {
    expect(
      detectPeauNormale(
        'Aqua, Glycerin, Niacinamide, Panthenol, Tocopherol',
        'serum',
        new Set<string>()
      )
    ).toEqual([])
  })

  test('eye-cream + clean → peau-normale', () => {
    expect(
      detectPeauNormale(
        'Aqua, Glycerin, Caffeine, Niacinamide, Panthenol, Tocopherol',
        'eye-cream',
        new Set<string>()
      )
    ).toContain(S.PEAU_NORMALE)
  })

  test('short INCI < 5 → abstain', () => {
    expect(
      detectPeauNormale('Aqua, Glycerin, Niacinamide', 'moisturizer', new Set<string>())
    ).toEqual([])
  })

  test('null INCI → []', () => {
    expect(detectPeauNormale(null, 'moisturizer', new Set<string>())).toEqual([])
  })
})

// D.1 audit fixes (2026-05-08)
// Coverage for the recall and mutex gaps closed in commit
// `fix(seed/auto-tags): close recall and mutex gaps in formula detectors`.

// detectGrossesseAvoid — sodium retinoyl hyaluronate test removed (migrated to algo-derm).

describe('detectStepNettoyage1 — extended sulfate variants', () => {
  test('coco-sulfate in top 5 → not flagged (foaming gel cleanser)', () => {
    expect(
      detectStepNettoyage1(
        'Aqua, Caprylic/Capric Triglyceride, Sodium Coco-Sulfate, Glycerin, Cocamidopropyl Betaine',
        'cleanser'
      )
    ).toEqual([])
  })

  test('coceth sulfate in top 5 → not flagged', () => {
    expect(
      detectStepNettoyage1(
        'Aqua, Caprylic/Capric Triglyceride, Disodium Coceth Sulfate, Glycerin',
        'cleanser'
      )
    ).toEqual([])
  })

  test('myreth sulfate in top 5 → not flagged', () => {
    expect(
      detectStepNettoyage1(
        'Aqua, Caprylic/Capric Triglyceride, Sodium Myreth Sulfate, Glycerin',
        'cleanser'
      )
    ).toEqual([])
  })
})

describe('detectNonGras — extended silicone patterns', () => {
  test('dimethiconol in top 5 (no vegetable oil) → non-gras', () => {
    const tags = detectNonGras('Aqua, Glycerin, Dimethiconol, Niacinamide', 'serum')
    expect(tags).toContain(S.NON_GRAS)
  })

  test('trimethylsiloxysilicate (film former) in top 5 → non-gras', () => {
    const tags = detectNonGras(
      'Aqua, Glycerin, Trimethylsiloxysilicate, Cyclopentasiloxane',
      'serum'
    )
    expect(tags).toContain(S.NON_GRAS)
  })

  test('dimethiconol + olea europaea oil top 5 → not flagged (vegetable oil exclusion)', () => {
    expect(
      detectNonGras('Aqua, Glycerin, Olea Europaea Fruit Oil, Dimethiconol, Niacinamide', 'serum')
    ).toEqual([])
  })
})

// Mutex invariants
// Pairs of slugs that are sensoriel-mutually-exclusive must never co-fire on
// the same INCI. Asserted on canonical fixtures that previously triggered
// double-emit (cf AUTO-TAGS.md §T1 cleanup post-WRITE).

describe('mutex invariants — sensoriel slugs cannot co-fire', () => {
  test('texture-riche / texture-legere (heavy butter formula)', () => {
    const inci = 'Aqua, Glycerin, Butyrospermum Parkii Butter, Theobroma Cacao Seed Butter, Beeswax'
    const riche = detectTextureRiche(inci)
    const legere = detectTextureLegere(inci, 'moisturizer')
    expect(riche.length > 0 && legere.length > 0).toBe(false)
  })

  test('texture-riche / texture-legere (light water-glycerin formula)', () => {
    const inci = 'Aqua, Glycerin, Niacinamide, Sodium Hyaluronate'
    const riche = detectTextureRiche(inci)
    const legere = detectTextureLegere(inci, 'serum')
    expect(riche.length > 0 && legere.length > 0).toBe(false)
  })

  test('non-gras / texture-riche (silicone serum)', () => {
    const inci = 'Aqua, Glycerin, Cyclopentasiloxane, Niacinamide, Dimethicone'
    const riche = detectTextureRiche(inci)
    const nonGras = detectNonGras(inci, 'serum')
    expect(riche.length > 0 && nonGras.length > 0).toBe(false)
  })
})

describe('detectTextureFromField (S5 — products.texture pass-through)', () => {
  test('null/undefined → no tag', () => {
    expect(detectTextureFromField(null)).toEqual([])
    expect(detectTextureFromField(undefined)).toEqual([])
  })

  test('gel → texture-gel', () => {
    expect(detectTextureFromField('gel')).toEqual([S.TEXTURE_GEL])
  })

  test('mousse → texture-mousse', () => {
    expect(detectTextureFromField('mousse')).toEqual([S.TEXTURE_MOUSSE])
  })

  test('stick → texture-stick', () => {
    expect(detectTextureFromField('stick')).toEqual([S.TEXTURE_STICK])
  })

  test('creme/huile/lait/eau/baume/patch → matching slug (admin override)', () => {
    expect(detectTextureFromField('creme')).toEqual([S.TEXTURE_CREME])
    expect(detectTextureFromField('huile')).toEqual([S.TEXTURE_HUILE])
    expect(detectTextureFromField('lait')).toEqual([S.TEXTURE_LAIT])
    expect(detectTextureFromField('eau')).toEqual([S.TEXTURE_EAU])
    expect(detectTextureFromField('baume')).toEqual([S.TEXTURE_BAUME])
    expect(detectTextureFromField('patch')).toEqual([S.TEXTURE_PATCH])
  })
})

describe('detectTextureGelInci (S5 INCI fallback)', () => {
  test('carbomer top 5 + aqueous serum → texture-gel', () => {
    const inci = 'Aqua, Glycerin, Carbomer, Niacinamide, Sodium Hyaluronate'
    expect(detectTextureGelInci(inci, 'serum', null)).toEqual([S.TEXTURE_GEL])
  })

  test('xanthan gum top 5 + moisturizer → texture-gel', () => {
    const inci = 'Aqua, Glycerin, Xanthan Gum, Panthenol, Allantoin'
    expect(detectTextureGelInci(inci, 'moisturizer', null)).toEqual([S.TEXTURE_GEL])
  })

  test('hydroxyethyl cellulose top 5 → texture-gel', () => {
    const inci = 'Aqua, Glycerin, Hydroxyethyl Cellulose, Niacinamide'
    expect(detectTextureGelInci(inci, 'serum', null)).toEqual([S.TEXTURE_GEL])
  })

  test('field set (any value) → fallback skipped (admin wins)', () => {
    const inci = 'Aqua, Carbomer, Glycerin'
    expect(detectTextureGelInci(inci, 'serum', 'creme')).toEqual([])
    expect(detectTextureGelInci(inci, 'serum', 'gel')).toEqual([])
  })

  test('rinse-off cleanser → skipped (gel-cleanser is rinsed)', () => {
    const inci = 'Aqua, Carbomer, Sodium Lauroyl Sarcosinate'
    expect(detectTextureGelInci(inci, 'cleanser', null)).toEqual([])
  })

  test('balm → skipped (chemistry contradicts gel)', () => {
    const inci = 'Aqua, Carbomer, Glycerin'
    expect(detectTextureGelInci(inci, 'balm', null)).toEqual([])
  })

  test('vegetable oil top 5 → skipped (not aqueous)', () => {
    const inci = 'Aqua, Glycerin, Carbomer, Argania Spinosa Kernel Oil, Tocopherol'
    expect(detectTextureGelInci(inci, 'serum', null)).toEqual([])
  })

  test('shea butter top 8 → skipped (rich emulsion)', () => {
    const inci =
      'Aqua, Carbomer, Glycerin, Niacinamide, Panthenol, Butyrospermum Parkii Butter, Tocopherol'
    expect(detectTextureGelInci(inci, 'moisturizer', null)).toEqual([])
  })

  test('silicone-led gel-cream → skipped (covered by non-gras/semi-occlusif)', () => {
    const inci = 'Aqua, Carbomer, Dimethicone, Glycerin, Niacinamide'
    expect(detectTextureGelInci(inci, 'serum', null)).toEqual([])
  })

  test('no gel-former in top 5 → no tag', () => {
    const inci = 'Aqua, Glycerin, Niacinamide, Panthenol, Tocopherol, Carbomer'
    expect(detectTextureGelInci(inci, 'serum', null)).toEqual([])
  })

  test('null INCI → no tag', () => {
    expect(detectTextureGelInci(null, 'serum', null)).toEqual([])
  })
})

// F2 — texture-creme default (kind-driven + veto INCI)
describe('detectTextureCremeInci (F2 default + veto)', () => {
  // Fires

  test('moisturizer with classic emulsion (water + glyceryl stearate + shea) → texture-creme', () => {
    const inci =
      'Aqua, Caprylic/Capric Triglyceride, Glycerin, Butyrospermum Parkii Butter, Cetearyl Alcohol, Glyceryl Stearate, Panthenol, Tocopherol'
    expect(detectTextureCremeInci(inci, 'moisturizer', null)).toEqual([S.TEXTURE_CREME])
  })

  test('moisturizer with steareth + cetyl palmitate emulsifier (Embryolisse-style) → texture-creme', () => {
    const inci =
      'Aqua, Glycerin, C12-15 Alkyl Benzoate, Dicaprylyl Carbonate, Steareth-21, Cetyl Palmitate, Steareth-2, Tocopherol'
    expect(detectTextureCremeInci(inci, 'moisturizer', null)).toEqual([S.TEXTURE_CREME])
  })

  test('foot-cream with polymeric emulsifier (SVR Xerial-style) → texture-creme', () => {
    const inci =
      'Water, Urea, Glycerin, Butyrospermum Parkii Butter, Octyldodecanol, Cetearyl Ethylhexanoate, Isohexadecane, Polyacrylate-13, Panthenol, Salicylic Acid'
    expect(detectTextureCremeInci(inci, 'foot-cream', null)).toEqual([S.TEXTURE_CREME])
  })

  test('moisturizer with emulsifier but no oily phase → fires (default, no veto)', () => {
    // Path 2: emulsifier alone is sufficient signal; no requirement for oily phase.
    const inci =
      'Aqua, Glycerin, Cetearyl Alcohol, Niacinamide, Panthenol, Sodium Hyaluronate, Allantoin, Tocopherol'
    expect(detectTextureCremeInci(inci, 'moisturizer', null)).toEqual([S.TEXTURE_CREME])
  })

  test('moisturizer water at pos 4, ester oil at pos 1 → fires (water in top 5, no veto)', () => {
    // Oil-led but not face-oil mistag: ester emollient (caprylic/capric) is not
    // in VEGETABLE_OIL_PATTERNS / BUTTER_WAX_PATTERNS, so veto 3 doesn't fire.
    const inci =
      'Caprylic/Capric Triglyceride, Cetearyl Alcohol, Glyceryl Stearate, Aqua, Glycerin, Tocopherol, Niacinamide, Panthenol'
    expect(detectTextureCremeInci(inci, 'moisturizer', null)).toEqual([S.TEXTURE_CREME])
  })

  test('sparse INCI (< 4 ingredients) → fires (trust kind)', () => {
    expect(detectTextureCremeInci('Aqua, Glycerin, Cetearyl Alcohol', 'moisturizer', null)).toEqual(
      [S.TEXTURE_CREME]
    )
  })

  test('null/empty INCI → fires (trust kind)', () => {
    expect(detectTextureCremeInci(null, 'moisturizer', null)).toEqual([S.TEXTURE_CREME])
    expect(detectTextureCremeInci('', 'moisturizer', null)).toEqual([S.TEXTURE_CREME])
  })

  test('Garancia-style INCI with asterisks → fires (slash-normalisation bug fixed)', () => {
    // Bug: 'caprylic/capric triglyceride' pattern had a slash; normalize() converts
    // slashes to spaces, so the pattern never matched. Fixed to 'caprylic capric triglyceride'.
    const inci =
      'Aqua*, Heptyl Undecylenate*, Glycerin*, Cetearyl Olivate*, Cetyl Alcohol*, Sorbitan Olivate*, Caprylic/Capric Triglyceride*, Pentylene Glycol*'
    expect(detectTextureCremeInci(inci, 'moisturizer', null)).toEqual([S.TEXTURE_CREME])
  })

  test('gel-cream (gel former + oily phase) → fires (veto 5 does not fire when oily phase present)', () => {
    const inci =
      'Aqua, Glycerin, Carbomer, Dimethicone, Cetearyl Alcohol, Glyceryl Stearate, Panthenol, Tocopherol'
    expect(detectTextureCremeInci(inci, 'moisturizer', null)).toEqual([S.TEXTURE_CREME])
  })

  // Skips (veto fires)

  test('admin texture field set → skipped (authoritative)', () => {
    const inci = 'Aqua, Glycerin, Cetearyl Alcohol, Caprylic/Capric Triglyceride'
    expect(detectTextureCremeInci(inci, 'moisturizer', 'gel')).toEqual([])
    expect(detectTextureCremeInci(inci, 'moisturizer', 'creme')).toEqual([])
  })

  test('serum/eye-cream kind → not eligible (only moisturizer/foot-cream)', () => {
    const inci =
      'Aqua, Glycerin, Caprylic/Capric Triglyceride, Cetearyl Alcohol, Glyceryl Stearate, Niacinamide, Tocopherol, Dimethicone'
    expect(detectTextureCremeInci(inci, 'serum', null)).toEqual([])
    expect(detectTextureCremeInci(inci, 'eye-cream', null)).toEqual([])
  })

  test('cleanser mistag (sodium laureth sulfate top 5) → skipped (veto 1)', () => {
    const inci =
      'Aqua, Glycerin, Sodium Laureth Sulfate, Coco-Betaine, Cetearyl Alcohol, Glyceryl Stearate, Niacinamide, Panthenol'
    expect(detectTextureCremeInci(inci, 'moisturizer', null)).toEqual([])
  })

  test('≥ 2 butters/waxes top 8 → skipped, defer to texture-riche (veto 2)', () => {
    const inci =
      'Aqua, Glycerin, Butyrospermum Parkii Butter, Theobroma Cacao Seed Butter, Cetearyl Alcohol, Beeswax, Panthenol, Tocopherol'
    expect(detectTextureCremeInci(inci, 'moisturizer', null)).toEqual([])
  })

  test('vegetable oil at pos 1 → skipped, face-oil mistag (veto 3)', () => {
    const inci =
      'Helianthus Annuus Seed Oil, Glycerin, Aqua, Cetearyl Alcohol, Glyceryl Stearate, Panthenol, Tocopherol, Niacinamide'
    expect(detectTextureCremeInci(inci, 'moisturizer', null)).toEqual([])
  })

  test('no water in top 5 → skipped, oil-led formula (veto 4)', () => {
    const inci =
      'Helianthus Annuus Seed Oil, Caprylic/Capric Triglyceride, Cetearyl Alcohol, Glyceryl Stearate, Squalane, Tocopherol, Aqua, Panthenol'
    expect(detectTextureCremeInci(inci, 'moisturizer', null)).toEqual([])
  })

  test('pure aqueous gel (carbomer top 5, no oily phase) → skipped (veto 5)', () => {
    const inci =
      'Aqua, Glycerin, Niacinamide, Sodium Hyaluronate, Carbomer, Panthenol, Allantoin, Tocopherol'
    expect(detectTextureCremeInci(inci, 'moisturizer', null)).toEqual([])
  })

  test('pure serum (water pos 1, no emulsifier, no oily phase) → skipped (veto 6)', () => {
    const inci =
      'Aqua, Glycerin, Niacinamide, Sodium Hyaluronate, Panthenol, Allantoin, Tocopherol, Arginine'
    expect(detectTextureCremeInci(inci, 'moisturizer', null)).toEqual([])
  })
})

// Eye-cream texture-creme (Path 1 relaxé)
describe('detectTextureCremeEyeInci (eye-cream path 1 relaxé)', () => {
  // Fires

  test('eye-cream + water top 1 + cetearyl alcohol top 3 → texture-creme', () => {
    const inci =
      'Aqua, Glycerin, Cetearyl Alcohol, Niacinamide, Caffeine, Panthenol, Tocopherol, Allantoin'
    expect(detectTextureCremeEyeInci(inci, 'eye-cream', null)).toEqual([S.TEXTURE_CREME])
  })

  test('eye-cream + water top 2 + glyceryl stearate top 8 → texture-creme', () => {
    const inci =
      'Caprylic/Capric Triglyceride, Aqua, Glycerin, Glyceryl Stearate, Caffeine, Panthenol, Tocopherol, Squalane'
    expect(detectTextureCremeEyeInci(inci, 'eye-cream', null)).toEqual([S.TEXTURE_CREME])
  })

  test('sparse INCI < 4 + cream name → fire', () => {
    expect(
      detectTextureCremeEyeInci(
        'Aqua, Glycerin, Cetearyl Alcohol',
        'eye-cream',
        null,
        'Super Eye Cream'
      )
    ).toEqual([S.TEXTURE_CREME])
  })

  test('null/empty INCI + cream name → fire', () => {
    expect(detectTextureCremeEyeInci(null, 'eye-cream', null, 'Crystal Retinal Eye Cream')).toEqual(
      [S.TEXTURE_CREME]
    )
    expect(detectTextureCremeEyeInci('', 'eye-cream', null, 'Crème Contour des Yeux')).toEqual([
      S.TEXTURE_CREME,
    ])
  })

  // Skips

  test('sparse INCI < 4, no name → abstain (unsafe to trust kind alone)', () => {
    expect(
      detectTextureCremeEyeInci('Aqua, Glycerin, Cetearyl Alcohol', 'eye-cream', null, null)
    ).toEqual([])
  })

  test('null/empty INCI, no name → abstain', () => {
    expect(detectTextureCremeEyeInci(null, 'eye-cream', null, null)).toEqual([])
    expect(detectTextureCremeEyeInci('', 'eye-cream', null, null)).toEqual([])
  })

  test('moisturizer kind → not eligible (eye-cream only)', () => {
    const inci =
      'Aqua, Glycerin, Cetearyl Alcohol, Niacinamide, Caffeine, Panthenol, Tocopherol, Allantoin'
    expect(detectTextureCremeEyeInci(inci, 'moisturizer', null)).toEqual([])
  })

  test('admin texture field set → skipped (admin wins)', () => {
    const inci = 'Aqua, Glycerin, Cetearyl Alcohol, Niacinamide, Caffeine, Panthenol'
    expect(detectTextureCremeEyeInci(inci, 'eye-cream', 'creme')).toEqual([])
    expect(detectTextureCremeEyeInci(inci, 'eye-cream', 'gel')).toEqual([])
  })

  test('serum-yeux (no emulsifier top 8) → gate fails → skipped', () => {
    const inci =
      'Aqua, Glycerin, Sodium Hyaluronate, Niacinamide, Caffeine, Panthenol, Tocopherol, Arginine'
    expect(detectTextureCremeEyeInci(inci, 'eye-cream', null)).toEqual([])
  })

  test('no water in top 3 (oil-led formula, water at pos 4) → gate fails → skipped', () => {
    const inci =
      'Squalane, Caprylic/Capric Triglyceride, Cetearyl Alcohol, Aqua, Glycerin, Caffeine, Panthenol, Allantoin'
    expect(detectTextureCremeEyeInci(inci, 'eye-cream', null)).toEqual([])
  })

  test('gel-former top 5 → veto 3 → skipped (texture-gel wins)', () => {
    const inci =
      'Aqua, Glycerin, Carbomer, Cetearyl Alcohol, Niacinamide, Caffeine, Panthenol, Allantoin'
    expect(detectTextureCremeEyeInci(inci, 'eye-cream', null)).toEqual([])
  })

  test('≥ 2 butters/waxes top 8 → veto 2 → skipped (texture-riche wins)', () => {
    const inci =
      'Aqua, Glycerin, Butyrospermum Parkii Butter, Cera Alba, Cetearyl Alcohol, Caffeine, Panthenol, Allantoin'
    expect(detectTextureCremeEyeInci(inci, 'eye-cream', null)).toEqual([])
  })

  test('ionic surfactant top 5 → veto 1 → skipped', () => {
    const inci = 'Aqua, Sodium Laureth Sulfate, Glycerin, Cetearyl Alcohol, Niacinamide, Caffeine'
    expect(detectTextureCremeEyeInci(inci, 'eye-cream', null)).toEqual([])
  })

  // Name-based veto

  test('INCI gate passes but name says baume → conflict → abstain (admin fallback)', () => {
    const inci =
      'Aqua, Glycerin, Cetearyl Alcohol, Niacinamide, Caffeine, Panthenol, Tocopherol, Allantoin'
    expect(
      detectTextureCremeEyeInci(inci, 'eye-cream', null, 'Baume Regard Immortelle Divine')
    ).toEqual([])
  })

  test('INCI gate passes but name says balm → abstain', () => {
    const inci =
      'Aqua, Glycerin, Cetearyl Alcohol, Niacinamide, Caffeine, Panthenol, Tocopherol, Allantoin'
    expect(detectTextureCremeEyeInci(inci, 'eye-cream', null, 'Palpebral Balm')).toEqual([])
  })

  test('INCI gate passes but name says gel → conflict → abstain', () => {
    const inci =
      'Aqua, Glycerin, Cetearyl Alcohol, Niacinamide, Caffeine, Panthenol, Tocopherol, Allantoin'
    expect(
      detectTextureCremeEyeInci(inci, 'eye-cream', null, 'Gel Hydratant Contour des Yeux')
    ).toEqual([])
  })

  test('name says serum → abstain regardless of INCI', () => {
    const inci =
      'Aqua, Glycerin, Cetearyl Alcohol, Niacinamide, Caffeine, Panthenol, Tocopherol, Allantoin'
    expect(detectTextureCremeEyeInci(inci, 'eye-cream', null, 'Revive Eye Serum')).toEqual([])
    expect(detectTextureCremeEyeInci(inci, 'eye-cream', null, 'Sérum Contour des Yeux')).toEqual([])
  })

  test('name says patch/hydrogel/ampoule → abstain', () => {
    const inci =
      'Aqua, Glycerin, Cetearyl Alcohol, Niacinamide, Caffeine, Panthenol, Tocopherol, Allantoin'
    expect(
      detectTextureCremeEyeInci(inci, 'eye-cream', null, 'Collagen Eye Patch Jericho Rose Jelly')
    ).toEqual([])
    expect(
      detectTextureCremeEyeInci(inci, 'eye-cream', null, 'Hyal Reyouth Hydrogel Eye Mask')
    ).toEqual([])
    expect(
      detectTextureCremeEyeInci(inci, 'eye-cream', null, 'Bee Pollen Renew Eye Ampouler')
    ).toEqual([])
  })

  test('name says cream, INCI gate passes → fire', () => {
    const inci =
      'Aqua, Glycerin, Cetearyl Alcohol, Niacinamide, Caffeine, Panthenol, Tocopherol, Allantoin'
    expect(
      detectTextureCremeEyeInci(inci, 'eye-cream', null, 'Advanced Snail Peptide Eye Cream')
    ).toEqual([S.TEXTURE_CREME])
  })

  test('null name → no hint → INCI gate authoritative', () => {
    // Normal INCI with emulsifier fires; no name conflict possible.
    const inci =
      'Aqua, Glycerin, Cetearyl Alcohol, Niacinamide, Caffeine, Panthenol, Tocopherol, Allantoin'
    expect(detectTextureCremeEyeInci(inci, 'eye-cream', null, null)).toEqual([S.TEXTURE_CREME])
  })
})

// Eye-cream texture-baume from name
describe('detectTextureBaumeFromName', () => {
  test('eye-cream + "Baume" in name → texture-baume', () => {
    expect(detectTextureBaumeFromName('eye-cream', null, 'Baume Regard Immortelle Divine')).toEqual(
      [S.TEXTURE_BAUME]
    )
  })

  test('eye-cream + "Palpebral Baume" → texture-baume', () => {
    expect(detectTextureBaumeFromName('eye-cream', null, 'SVR Palpebral Baume')).toEqual([
      S.TEXTURE_BAUME,
    ])
  })

  test('eye-cream + "balm" (EN) in name → texture-baume', () => {
    expect(detectTextureBaumeFromName('eye-cream', null, 'Palpebral Balm Soothing')).toEqual([
      S.TEXTURE_BAUME,
    ])
  })

  test('admin texture set → skipped (field wins)', () => {
    expect(detectTextureBaumeFromName('eye-cream', 'baume', 'Baume Regard')).toEqual([])
    expect(detectTextureBaumeFromName('eye-cream', 'creme', 'Baume Regard')).toEqual([])
  })

  test('moisturizer + "Baume" in name → texture-baume (F6 Q3)', () => {
    expect(detectTextureBaumeFromName('moisturizer', null, 'CeraVe Baume Hydratant')).toEqual([
      S.TEXTURE_BAUME,
    ])
  })

  test('moisturizer + "Balm" in name → texture-baume', () => {
    expect(detectTextureBaumeFromName('moisturizer', null, 'Prequel Skin Utility Balm')).toEqual([
      S.TEXTURE_BAUME,
    ])
  })

  test('moisturizer + "Ointment" in name → texture-baume', () => {
    expect(
      detectTextureBaumeFromName('moisturizer', null, 'Prequel Skin Utility Ointment')
    ).toEqual([S.TEXTURE_BAUME])
  })

  test('moisturizer without baume/balm/ointment in name → no tag', () => {
    expect(detectTextureBaumeFromName('moisturizer', null, 'Avène Hydrance Crème')).toEqual([])
  })

  test('balm kind → not eligible (already covered by kind-tag)', () => {
    expect(detectTextureBaumeFromName('balm', null, 'Baume Corps')).toEqual([])
  })

  test('other kinds → not eligible', () => {
    expect(detectTextureBaumeFromName('cleanser', null, 'Baume Démaquillant')).toEqual([])
    expect(detectTextureBaumeFromName('serum', null, 'Baume Sérum')).toEqual([])
  })

  test('rinse-off / non-leave-on-face name veto → no tag (kind mistag protection)', () => {
    expect(detectTextureBaumeFromName('moisturizer', null, 'Topialyse Baume Lavant')).toEqual([])
    expect(
      detectTextureBaumeFromName('moisturizer', null, 'Cicabiafine Douche Baume Surgras')
    ).toEqual([])
    expect(
      detectTextureBaumeFromName('moisturizer', null, 'Clinique Baume à Lèvres Hydratant')
    ).toEqual([])
    expect(detectTextureBaumeFromName('moisturizer', null, 'Eucerin Baume Levers')).toEqual([])
    expect(
      detectTextureBaumeFromName('moisturizer', null, 'Avène Homme Baume Après-Rasage')
    ).toEqual([])
    expect(detectTextureBaumeFromName('moisturizer', null, 'Lip Balm Hydratant')).toEqual([])
  })

  test('eye-cream without baume/balm in name → no tag', () => {
    expect(detectTextureBaumeFromName('eye-cream', null, 'Crystal Retinal Eye Cream')).toEqual([])
    expect(detectTextureBaumeFromName('eye-cream', null, null)).toEqual([])
  })

  // Corpus fixtures (from spot-check)
  test("L'Occitane Baume Regard → texture-baume", () => {
    expect(detectTextureBaumeFromName('eye-cream', null, 'Baume Regard Immortelle Divine')).toEqual(
      [S.TEXTURE_BAUME]
    )
  })

  test('SVR Palpebral Baume → texture-baume', () => {
    expect(detectTextureBaumeFromName('eye-cream', null, 'Palpebral Baume')).toEqual([
      S.TEXTURE_BAUME,
    ])
  })
})

// texture-stick name-driven (F4)
describe('detectTextureStickFromName', () => {
  test('lip-care + "Stick Lèvres" → texture-stick', () => {
    expect(
      detectTextureStickFromName('lip-care', null, 'Cold Cream Stick Levres Nutrition')
    ).toEqual([S.TEXTURE_STICK])
  })

  test('moisturizer + "Sun Stick" → texture-stick (Korean sunscreen sticks)', () => {
    expect(
      detectTextureStickFromName(
        'moisturizer',
        null,
        'Hyaluronic Acid Airy Sun Stick SPF50+ PA++++'
      )
    ).toEqual([S.TEXTURE_STICK])
  })

  test('balm + "Stick Balm" → texture-stick', () => {
    expect(detectTextureStickFromName('balm', null, 'Centella Stick Balm')).toEqual([
      S.TEXTURE_STICK,
    ])
  })

  test('spot-treatment + "Stick Correcteur" → texture-stick', () => {
    expect(
      detectTextureStickFromName('spot-treatment', null, 'Couvrance Stick Correcteur Vert')
    ).toEqual([S.TEXTURE_STICK])
  })

  test('SPF50+ / PA++++ are not vetoed (no whitespace + product term after)', () => {
    expect(detectTextureStickFromName('moisturizer', null, 'Sun Stick SPF50+ PA++++')).toEqual([
      S.TEXTURE_STICK,
    ])
  })

  test('compound product "Crème + Stick Lèvres" → vetoed (duo, not stick-primary)', () => {
    expect(
      detectTextureStickFromName(
        'lip-care',
        null,
        'La Roche-Posay Lipikar Crème Mains Réparatrice + Stick Lèvres'
      )
    ).toEqual([])
  })

  test('admin texture set → skipped (field wins)', () => {
    expect(detectTextureStickFromName('lip-care', 'creme', 'Stick Lèvres')).toEqual([])
    expect(detectTextureStickFromName('lip-care', 'stick', 'Stick Lèvres')).toEqual([])
  })

  test('rinse-off kinds → not eligible (Q1 cohérence)', () => {
    expect(detectTextureStickFromName('cleanser', null, 'Soin Nettoyant Visage Stick')).toEqual([])
    expect(detectTextureStickFromName('mask', null, 'Quick Clay Stick Mask')).toEqual([])
  })

  test('serum/toner/oil → not eligible', () => {
    expect(detectTextureStickFromName('serum', null, 'Stick Sérum')).toEqual([])
  })

  test('name without stick/bâton → no tag', () => {
    expect(detectTextureStickFromName('lip-care', null, 'Hydra Lip Cream')).toEqual([])
    expect(detectTextureStickFromName('moisturizer', null, null)).toEqual([])
  })

  test('"bâton" (FR accentué) detected', () => {
    expect(detectTextureStickFromName('lip-care', null, 'Bâton à lèvres')).toEqual([
      S.TEXTURE_STICK,
    ])
  })
})

// Eye-cream texture-creme / texture-legere separation
describe('mutex invariants — eye-cream texture-creme vs texture-legere', () => {
  test('eye-cream serum-style (no emulsifier) → texture-legere fires, texture-creme does not', () => {
    const inci =
      'Aqua, Glycerin, Sodium Hyaluronate, Niacinamide, Caffeine, Panthenol, Tocopherol, Arginine'
    expect(detectTextureCremeEyeInci(inci, 'eye-cream', null)).toEqual([])
    expect(detectTextureLegere(inci, 'eye-cream')).toContain(S.TEXTURE_LEGERE)
  })

  test('eye-cream cream-style (emulsifier) → texture-creme fires, texture-legere does not (emulsifier excluded from heavy patterns but typical cream formula avoids co-fire via oily phase)', () => {
    // Cream with vegetable oil → texture-legere excluded via HEAVY_EXCLUSION_PATTERNS
    const inci =
      'Aqua, Glycerin, Helianthus Annuus Seed Oil, Cetearyl Alcohol, Niacinamide, Caffeine, Panthenol, Tocopherol'
    expect(detectTextureCremeEyeInci(inci, 'eye-cream', null)).toContain(S.TEXTURE_CREME)
    expect(detectTextureLegere(inci, 'eye-cream')).toEqual([])
  })
})

// F2 mutex — texture-creme / texture-legere on oil-driven emulsion
describe('mutex invariants — texture-creme vs texture-legere (F2)', () => {
  test('moisturizer with sunflower oil emulsion → only texture-creme, not legere', () => {
    const inci =
      'Aqua, Glycerin, Helianthus Annuus Seed Oil, Cetearyl Alcohol, Glyceryl Stearate, Panthenol, Tocopherol, Niacinamide'
    const creme = detectTextureCremeInci(inci, 'moisturizer', null)
    const legere = detectTextureLegere(inci, 'moisturizer')
    expect(creme.length > 0 && legere.length > 0).toBe(false)
    expect(creme).toEqual([S.TEXTURE_CREME])
  })

  test('serum with sunflower oil top 5 → texture-legere also abstains (vegetable oil exclusion)', () => {
    const inci = 'Aqua, Glycerin, Helianthus Annuus Seed Oil, Niacinamide, Tocopherol'
    expect(detectTextureLegere(inci, 'serum')).toEqual([])
  })
})

// Absence claims (name/description fallback)
describe('detectAbsenceClaimsFromText — sans-parfum override', () => {
  test('description with "sans parfum" → SANS_PARFUM', () => {
    expect(detectAbsenceClaimsFromText('Crème Apaisante', 'sans parfum, non comédogène')).toEqual([
      S.SANS_PARFUM,
    ])
  })

  test('name with "Sans Parfum" (mixed case) → SANS_PARFUM', () => {
    expect(detectAbsenceClaimsFromText('Crème Sans Parfum', null)).toEqual([S.SANS_PARFUM])
  })

  test('description with "fragrance-free" → SANS_PARFUM', () => {
    expect(detectAbsenceClaimsFromText('Daily Moisturizer', 'A fragrance-free formula')).toEqual([
      S.SANS_PARFUM,
    ])
  })

  test('name "Parfum à la rose" (positive parfum mention) → no fire', () => {
    expect(detectAbsenceClaimsFromText('Parfum à la rose', null)).toEqual([])
  })

  test('null name + null description → empty', () => {
    expect(detectAbsenceClaimsFromText(null, null)).toEqual([])
  })
})

describe('detectSansSavon', () => {
  test('syndet face cleanser (no soap) → sans-savon', () => {
    expect(
      detectSansSavon(
        'Aqua, Sodium Cocoyl Isethionate, Cocamidopropyl Betaine, Glycerin',
        'cleanser'
      )
    ).toContain(S.SANS_SAVON)
  })

  test('syndet body-wash → sans-savon', () => {
    expect(detectSansSavon('Aqua, Sodium Laureth Sulfate, Coco-Glucoside', 'body-wash')).toContain(
      S.SANS_SAVON
    )
  })

  test('body-scrub syndet → sans-savon', () => {
    expect(detectSansSavon('Aqua, Sucrose, Coco-Glucoside, Glycerin', 'body-scrub')).toContain(
      S.SANS_SAVON
    )
  })

  // Trap: acyl syndets (-oyl) are NOT soap, only fatty-acid salts (-ate) are.
  test('sodium lauroyl sarcosinate (acyl syndet, not laurate) → sans-savon', () => {
    expect(detectSansSavon('Aqua, Sodium Lauroyl Sarcosinate, Coco-Betaine', 'cleanser')).toContain(
      S.SANS_SAVON
    )
  })

  // Trap: fatty-acid esters (alcohol-bound, no alkali) are NOT soap.
  test('cleanser with glyceryl stearate (ester, not soap) → sans-savon', () => {
    expect(detectSansSavon('Aqua, Glyceryl Stearate, Coco-Glucoside', 'cleanser')).toContain(
      S.SANS_SAVON
    )
  })

  test('true soap bar (sodium palmate + sodium cocoate) → not flagged', () => {
    expect(detectSansSavon('Sodium Palmate, Sodium Cocoate, Aqua, Glycerin', 'cleanser')).toEqual(
      []
    )
  })

  test('sodium cocoate (saponified) vs cocoyl: cocoate IS soap', () => {
    expect(detectSansSavon('Aqua, Sodium Cocoate', 'body-wash')).toEqual([])
  })

  test('potassium soap (liquid castile) → not flagged', () => {
    expect(detectSansSavon('Aqua, Potassium Olivate, Potassium Cocoate', 'cleanser')).toEqual([])
  })

  test('saponified-oil handmade soap → not flagged', () => {
    expect(detectSansSavon('Saponified Olea Europaea Oil, Aqua', 'cleanser')).toEqual([])
  })

  test('non-cleansing kind (serum) → never tagged even without soap', () => {
    expect(detectSansSavon('Aqua, Niacinamide, Glycerin', 'serum')).toEqual([])
  })

  test('null/empty INCI → [] (no evidence of absence)', () => {
    expect(detectSansSavon(null, 'cleanser')).toEqual([])
    expect(detectSansSavon('', 'cleanser')).toEqual([])
  })
})
