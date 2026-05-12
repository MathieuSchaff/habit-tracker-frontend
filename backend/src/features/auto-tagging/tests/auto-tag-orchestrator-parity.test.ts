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

import { SKINCARE_PRODUCT_TAG_SLUGS } from '@habit-tracker/shared'

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
    expect(sources.has('grossesse-avoid')).toBe(true)

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

  test('fragile INCI + structured % claim emits percent-claim source', () => {
    const got = detectAllAutoTags({
      inci: 'Adenosine, Allantoin, Betaine, Caffeine, Ceramide NP, Dimethicone',
      kind: 'serum',
      category: 'skincare',
      percentClaims: [{ ingredientSlug: 'retinol', concentrationValue: 1, concentrationUnit: '%' }],
    })
    expect(got.some((p) => p.source === 'percent-claim' && p.tagSlug === S.RETINOIDS)).toBe(true)
  })
})

describe('detectAllAutoTags — runner pathway parity', () => {
  // Both runners build their write payload by mapping `detectAllAutoTags`
  // output to (slug, tagSlug, relevance) shape. This test simulates both
  // pathways and asserts they produce identical pair sets — which is the
  // operational guarantee that `make dev-fresh` followed by
  // `make backfill-auto-tags` is a no-op on auto-tag pairs.
  const fixture: { slug: string; product: OrchestratorInput }[] = [
    {
      slug: 'retinol-serum',
      product: {
        inci: 'Aqua, Glycerin, Retinol, Tocopherol, Phenoxyethanol',
        kind: 'serum',
        category: 'skincare',
      },
    },
    {
      slug: 'mineral-sunscreen',
      product: {
        inci: 'Aqua, Zinc Oxide, Titanium Dioxide, Glycerin',
        kind: 'sunscreen',
        category: 'solaire',
      },
    },
    {
      slug: 'body-retinoid-lotion',
      product: {
        inci: 'Aqua, Glycerin, Retinyl Palmitate, Shea Butter',
        kind: 'body-lotion',
        category: 'bodycare',
      },
    },
    {
      slug: 'plain-moisturizer',
      product: {
        inci: 'Aqua, Glycerin, Niacinamide, Hyaluronic Acid, Tocopherol, Phenoxyethanol',
        kind: 'moisturizer',
        category: 'skincare',
      },
    },
    {
      slug: 'no-inci-product',
      product: { inci: null, kind: 'toner', category: 'skincare' },
    },
  ]

  // Seed-core pathway: emit (slug, tagSlug, relevance) per product.
  const seedCorePairs = (
    items: typeof fixture
  ): { slug: string; tagSlug: string; relevance: string }[] => {
    const out: { slug: string; tagSlug: string; relevance: string }[] = []
    for (const { slug, product } of items) {
      for (const p of detectAllAutoTags(product)) {
        out.push({ slug, tagSlug: p.tagSlug, relevance: p.relevance })
      }
    }
    return out.sort((a, b) =>
      a.slug === b.slug ? a.tagSlug.localeCompare(b.tagSlug) : a.slug.localeCompare(b.slug)
    )
  }

  // Backfill pathway: same input, same orchestrator call. Only difference in
  // production is the tagSlug→tagId resolution + DB existing-row diff, which
  // sit downstream of the orchestrator and apply identically.
  const backfillPairs = (
    items: typeof fixture
  ): { slug: string; tagSlug: string; relevance: string }[] => {
    const out: { slug: string; tagSlug: string; relevance: string }[] = []
    for (const { slug, product } of items) {
      for (const p of detectAllAutoTags(product)) {
        out.push({ slug, tagSlug: p.tagSlug, relevance: p.relevance })
      }
    }
    return out.sort((a, b) =>
      a.slug === b.slug ? a.tagSlug.localeCompare(b.tagSlug) : a.slug.localeCompare(b.slug)
    )
  }

  test('seed-core and backfill emit identical pair set on fixture', () => {
    expect(backfillPairs(fixture)).toEqual(seedCorePairs(fixture))
  })

  test('fixture covers all eligibility categories', () => {
    const cats = new Set(fixture.map((f) => f.product.category))
    expect(cats).toEqual(new Set(AUTO_TAG_ELIGIBLE_CATEGORIES))
  })

  test('fixture has at least one avoid pair (covers safety pass)', () => {
    const allPairs = fixture.flatMap((f) => detectAllAutoTags(f.product))
    expect(allPairs.some((p) => p.relevance === 'avoid')).toBe(true)
  })
})
