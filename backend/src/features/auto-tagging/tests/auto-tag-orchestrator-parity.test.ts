// Parity contract for the auto-tag orchestrator. Both `runners/seed-core`
// (initial seed) and `runners/backfill-auto-tags` (rehydrate) consume
// `detectAllAutoTags` as their single tag-emission path — so the test of
// runner parity reduces to verifying the orchestrator behaves consistently:
//   - same input twice → identical output
//   - eligibility honored (skincare/solaire/bodycare only)
//   - avoid wins over secondary on intra-product dedup
//   - empty INCI still emits kind/cross-signal-avoid tags
//   - representative fixture products yield the expected pair set
//
// If a runner ever bypasses the orchestrator (inline detection pass), this
// test won't catch it directly — the contract is enforced by the runners
// importing from `auto-tag-orchestrator` and nothing else for tag derivation.
// Audit §C.5 parity goal.

import { describe, expect, test } from 'bun:test'

import { SKINCARE_PRODUCT_TAG_SLUGS } from '@aurore/shared'

import {
  AUTO_TAG_ELIGIBLE_CATEGORIES,
  type AutoTagPair,
  detectAllAutoTags,
  type OrchestratorInput,
} from '../orchestrator'

const S = SKINCARE_PRODUCT_TAG_SLUGS

const slugsOf = (pairs: AutoTagPair[]) => pairs.map((p) => p.tagSlug).sort()
const slugRelevance = (pairs: AutoTagPair[], slug: string) =>
  pairs.find((p) => p.tagSlug === slug)?.relevance

describe('AUTO_TAG_ELIGIBLE_CATEGORIES', () => {
  test('only skincare/solaire/bodycare are eligible', () => {
    expect([...AUTO_TAG_ELIGIBLE_CATEGORIES]).toEqual(['skincare', 'solaire', 'bodycare'])
  })
})

describe('detectAllAutoTags — eligibility gating', () => {
  test('haircare product → empty pairs', () => {
    const got = detectAllAutoTags({
      inci: 'Aqua, Sodium Lauryl Sulfate, Cocamidopropyl Betaine',
      kind: 'cleanser',
      category: 'haircare',
    })
    expect(got).toEqual([])
  })

  test('supplement → empty pairs', () => {
    const got = detectAllAutoTags({
      inci: null,
      kind: 'moisturizer',
      category: 'supplements',
    })
    expect(got).toEqual([])
  })

  test('skincare → emits at least kind tags even with empty INCI', () => {
    const got = detectAllAutoTags({ inci: null, kind: 'serum', category: 'skincare' })
    const slugs = slugsOf(got)
    expect(slugs).toContain(S.TYPE_SERUM)
    expect(slugs).toContain(S.STEP_TRAITEMENT)
    expect(slugs).toContain(S.ZONE_VISAGE)
  })
})

describe('detectAllAutoTags — determinism', () => {
  test('same product input → identical pair set across calls (parity contract)', () => {
    const product: OrchestratorInput = {
      inci: 'Aqua, Glycerin, Niacinamide, Retinol, Tocopherol, Phenoxyethanol',
      kind: 'serum',
      category: 'skincare',
    }
    const a = detectAllAutoTags(product)
    const b = detectAllAutoTags(product)
    expect(slugsOf(a)).toEqual(slugsOf(b))
    // Each tagSlug carries the same relevance + source on both runs.
    for (const pair of a) {
      const match = b.find((p) => p.tagSlug === pair.tagSlug)
      expect(match).toBeDefined()
      expect(match?.relevance).toBe(pair.relevance)
      expect(match?.source).toBe(pair.source)
    }
  })
})

describe('detectAllAutoTags — relevance precedence', () => {
  test('retinoid serum: grossesse-compatible emitted as avoid (not secondary)', () => {
    const got = detectAllAutoTags({
      inci: 'Aqua, Glycerin, Retinol, Tocopherol, Phenoxyethanol',
      kind: 'serum',
      category: 'skincare',
    })
    expect(slugRelevance(got, S.GROSSESSE_COMPATIBLE)).toBe('avoid')
  })

  test('retinoid + AHA leave-on: peau-sensible emitted as avoid (cross-signal)', () => {
    const got = detectAllAutoTags({
      inci: 'Aqua, Glycerin, Retinol, Glycolic Acid, Phenoxyethanol',
      kind: 'serum',
      category: 'skincare',
    })
    expect(slugRelevance(got, S.PEAU_SENSIBLE)).toBe('avoid')
  })

  test('avoid relevance is preserved when same tag could fire from secondary path', () => {
    const got = detectAllAutoTags({
      inci: 'Aqua, Retinol, Salicylic Acid, Phenoxyethanol',
      kind: 'serum',
      category: 'skincare',
    })
    // peau-sensible must never appear twice; one entry, relevance=avoid.
    const peauSensiblePairs = got.filter((p) => p.tagSlug === S.PEAU_SENSIBLE)
    expect(peauSensiblePairs).toHaveLength(1)
    expect(peauSensiblePairs[0]?.relevance).toBe('avoid')
  })
})

describe('detectAllAutoTags — pass coverage on representative products', () => {
  test('retinoid serum (skincare): algo-derm + actif-class + kind + cross-signal + avoid all fire', () => {
    const got = detectAllAutoTags({
      inci: 'Aqua, Glycerin, Retinol, Tocopherol, Phenoxyethanol',
      kind: 'serum',
      category: 'skincare',
    })
    const sources = new Set(got.map((p) => p.source))
    expect(sources.has('actif-class')).toBe(true)
    expect(sources.has('kind')).toBe(true)
    expect(sources.has('cross-signal')).toBe(true)
    expect(sources.has('algo-derm')).toBe(true)

    const slugs = slugsOf(got)
    expect(slugs).toContain(S.RETINOIDS)
    expect(slugs).toContain(S.TYPE_SERUM)
    expect(slugs).toContain(S.MOMENT_SOIR)
    expect(slugs).toContain(S.GROSSESSE_COMPATIBLE)
  })

  test('mineral sunscreen (solaire): kind tags + filtres-mineraux + protection', () => {
    const got = detectAllAutoTags({
      inci: 'Aqua, Zinc Oxide, Titanium Dioxide, Glycerin, Phenoxyethanol',
      kind: 'sunscreen',
      category: 'solaire',
    })
    const slugs = slugsOf(got)
    expect(slugs).toContain(S.TYPE_SOLAIRE)
    expect(slugs).toContain(S.STEP_PROTECTION_SOLAIRE)
    expect(slugs).toContain(S.MOMENT_MATIN)
    expect(slugs).toContain(S.FILTRES_MINERAUX)
  })

  test('body lotion with retinoid (bodycare): cross-signal anti-age + grossesse avoid', () => {
    const got = detectAllAutoTags({
      inci: 'Aqua, Glycerin, Retinyl Palmitate, Shea Butter, Phenoxyethanol',
      kind: 'body-lotion',
      category: 'bodycare',
    })
    const slugs = slugsOf(got)
    expect(slugs).toContain(S.RETINOIDS)
    expect(slugs).toContain(S.ANTI_AGE)
    expect(slugRelevance(got, S.GROSSESSE_COMPATIBLE)).toBe('avoid')
  })

  test('eye cream with caffeine + peptide: cernes-poches fires (formula pass)', () => {
    const got = detectAllAutoTags({
      inci: 'Aqua, Glycerin, Caffeine, Palmitoyl Tripeptide-1, Phenoxyethanol',
      kind: 'eye-cream',
      category: 'skincare',
    })
    const slugs = slugsOf(got)
    expect(slugs).toContain(S.CERNES_POCHES)
    expect(slugs).toContain(S.ZONE_YEUX)
  })

  test('oil cleanser (skincare): step-nettoyage-1 fires (formula pass)', () => {
    const got = detectAllAutoTags({
      inci: 'Caprylic/Capric Triglyceride, Olea Europaea Fruit Oil, Polysorbate 20, Tocopherol',
      kind: 'cleanser',
      category: 'skincare',
    })
    const slugs = slugsOf(got)
    expect(slugs).toContain(S.STEP_NETTOYAGE_1)
    expect(slugs).toContain(S.TYPE_NETTOYANT)
  })

  test('oat INCI without atopy naming → NO eczema-atopie (INCI signal unwired)', () => {
    const got = detectAllAutoTags({
      inci: 'Aqua, Glycerin, Avena Sativa Kernel Flour, Tocopherol, Phenoxyethanol',
      kind: 'body-lotion',
      category: 'bodycare',
      name: 'Crème Hydratante Corps',
    })
    expect(slugsOf(got)).not.toContain(S.ECZEMA_ATOPIE)
  })

  test('atopy-named product → eczema-atopie still fires (name pass is sole source)', () => {
    const got = detectAllAutoTags({
      inci: 'Aqua, Glycerin, Tocopherol, Phenoxyethanol',
      kind: 'moisturizer',
      category: 'skincare',
      name: 'Baume Émollient Peau Atopique',
    })
    expect(slugsOf(got)).toContain(S.ECZEMA_ATOPIE)
  })

  test('fragile INCI + structured % claim emits percent-claim source', () => {
    const got = detectAllAutoTags({
      inci: 'Adenosine, Allantoin, Betaine, Caffeine, Ceramide NP, Dimethicone',
      kind: 'serum',
      category: 'skincare',
      percentClaims: [{ ingredientSlug: 'retinol', concentrationValue: 1, concentrationUnit: '%' }],
    })
    expect(got.some((p) => p.source === 'percent-claim' && p.tagSlug === S.RETINOIDS)).toBe(true)
  })

  // Formula passes unit-tested in formula.test.ts but with no orchestrator-level
  // assertion: confirm each still survives the full pipeline (passes + dedup).
  test('silicone serum: semi-occlusif + non-gras both fire', () => {
    const slugs = slugsOf(
      detectAllAutoTags({
        inci: 'Aqua, Glycerin, Dimethicone, Niacinamide, Tocopherol',
        kind: 'serum',
        category: 'skincare',
      })
    )
    expect(slugs).toContain(S.SEMI_OCCLUSIF)
    expect(slugs).toContain(S.NON_GRAS)
  })

  test('urea body lotion (bodycare): keratose-pilaire fires', () => {
    const slugs = slugsOf(
      detectAllAutoTags({
        inci: 'Aqua, Urea, Glycerin, Petrolatum',
        kind: 'body-lotion',
        category: 'bodycare',
      })
    )
    expect(slugs).toContain(S.KERATOSE_PILAIRE)
  })

  test('plumping repair serum: repulpant + reparation-cutanee both fire', () => {
    const slugs = slugsOf(
      detectAllAutoTags({
        inci: 'Aqua, Sodium Hyaluronate, Glycerin, Panthenol, Acetyl Hexapeptide-8',
        kind: 'serum',
        category: 'skincare',
      })
    )
    expect(slugs).toContain(S.REPULPANT)
    expect(slugs).toContain(S.REPARATION)
  })

  test('mattifying tinted prebiotic serum: prebiotique + fini-mat + pigments-verts fire', () => {
    const slugs = slugsOf(
      detectAllAutoTags({
        inci: 'Aqua, Inulin, Silica, CI 77288, Glycerin',
        kind: 'serum',
        category: 'skincare',
      })
    )
    expect(slugs).toContain(S.PREBIOTIQUE)
    expect(slugs).toContain(S.FINI_MAT)
    expect(slugs).toContain(S.PIGMENTS_VERTS)
  })

  test('classic emulsion moisturizer: texture-creme fires, peau-normale abstains', () => {
    const slugs = slugsOf(
      detectAllAutoTags({
        inci: 'Aqua, Glycerin, Cetyl Alcohol, Cetearyl Alcohol, Glyceryl Stearate, Panthenol, Tocopherol',
        kind: 'moisturizer',
        category: 'skincare',
      })
    )
    expect(slugs).toContain(S.TEXTURE_CREME)
    // peau-normale is a residual pass: it abstains once algo-derm classifies skin_type
    // (peau-seche/peau-sensible here). Asserting the abstention is stable — unlike asserting it
    // fires — and guards the pass-order-drift failure mode (README §Failure modes). Positive
    // firing is covered by its unit test + the gold-set bench, not a synthetic orchestrator fixture.
    expect(slugs).not.toContain(S.PEAU_NORMALE)
  })

  test('eye balm named "Baume": texture-baume fires', () => {
    const slugs = slugsOf(
      detectAllAutoTags({
        inci: 'Aqua, Glycerin, Cetearyl Alcohol, Caffeine, Panthenol',
        kind: 'eye-cream',
        category: 'skincare',
        name: 'Baume Contour des Yeux',
      })
    )
    expect(slugs).toContain(S.TEXTURE_BAUME)
  })
})
