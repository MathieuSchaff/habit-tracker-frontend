import { describe, expect, test } from 'bun:test'

import { SKINCARE_PRODUCT_TAG_SLUGS } from '@aurore/shared'

import { detectAutoTags, TAG_CONFIG } from '../passes/algo-derm-detection'

const S = SKINCARE_PRODUCT_TAG_SLUGS

describe('algo-derm-detection', () => {
  test('empty/null/whitespace INCI returns []', () => {
    expect(detectAutoTags(null, 'moisturizer')).toEqual([])
    expect(detectAutoTags(undefined, 'moisturizer')).toEqual([])
    expect(detectAutoTags('', 'moisturizer')).toEqual([])
    expect(detectAutoTags('   ', 'moisturizer')).toEqual([])
  })

  test('comedogenic ingredient on leave-on product → comedogene tag', () => {
    // Coconut oil is a direct keyword match in algo-derm — high confidence.
    const inci = 'Aqua, Coconut Oil, Glycerin'
    const tags = detectAutoTags(inci, 'moisturizer')
    const slugs = tags.map((t) => t.slug)
    expect(slugs).toContain(S.COMEDOGENE)
  })

  test('comedogenic ingredient on rinse-off cleanser → comedogene filtered out', () => {
    // Same INCI, rinse-off kind: excludeRinseOff drops the tag.
    const inci = 'Aqua, Coconut Oil, Glycerin'
    const tags = detectAutoTags(inci, 'cleanser')
    const slugs = tags.map((t) => t.slug)
    expect(slugs).not.toContain(S.COMEDOGENE)
  })

  test('allow:false tags are never emitted (matifiant, repulpant, sans-savon, eczema-atopie)', () => {
    // INCI designed to trigger several disabled tags:
    // - hyaluronic acid + glycerin → repulpant (allow:false)
    // - niacinamide → matifiant (allow:false — algo-derm path; sensoriel
    //   detector lives in passes/formula/ and keys on absorbent powders)
    // - gentle ingredients → would normally fire peaux-atopiques
    // Hypoallergenique is intentionally not in this disabled list.
    const inci = 'Aqua, Glycerin, Sodium Hyaluronate, Niacinamide, Phenoxyethanol'
    const tags = detectAutoTags(inci, 'serum')
    const slugs = new Set(tags.map((t) => t.slug))
    expect(slugs.has(S.REPULPANT)).toBe(false)
    expect(slugs.has(S.MATIFIANT)).toBe(false)
    expect(slugs.has(S.SANS_SAVON)).toBe(false)
    expect(slugs.has(S.ECZEMA_ATOPIE)).toBe(false)
  })

  test('non-avoid tags have relevance=secondary; grossesse_risque fires as avoid', () => {
    // INCI without grossesse contraindications → all secondary
    const safeInci = 'Aqua, Glycerin, Niacinamide, Tocopherol, Phenoxyethanol'
    const safeTags = detectAutoTags(safeInci, 'serum')
    expect(safeTags.length).toBeGreaterThan(0)
    for (const t of safeTags) {
      expect(t.relevance).toBe('secondary')
      expect(t.confidence).toBeGreaterThanOrEqual(0)
      expect(t.confidence).toBeLessThanOrEqual(1)
    }
    // INCI with retinoid → grossesse_risque fires as avoid
    const retinoidInci = 'Aqua, Retinol, Glycerin, Tocopherol, Phenoxyethanol'
    const retinoidTags = detectAutoTags(retinoidInci, 'serum')
    const avoidTags = retinoidTags.filter((t) => t.relevance === 'avoid')
    expect(avoidTags.length).toBeGreaterThan(0)
    expect(avoidTags.some((t) => t.slug === S.GROSSESSE_COMPATIBLE)).toBe(true)
  })

  test('confOverride raises confidenceFloor globally (computed_score only)', () => {
    // peau-sensible at confidenceFloor 0.5 — should appear normally on a gentle INCI.
    const inci = 'Aqua, Glycerin, Panthenol, Allantoin, Centella Asiatica Extract'
    const baseline = detectAutoTags(inci, 'serum')
    const tightened = detectAutoTags(inci, 'serum', { confOverride: 0.99 })
    // confOverride 0.99 is so strict only computed_score candidates with
    // confidence ≈ 1 survive. Absence tags (sans-X) are unaffected by
    // confOverride (their confidence ≡ coverage; gate via coverageMinOverride
    // — same raise-only semantics).
    expect(tightened.length).toBeLessThanOrEqual(baseline.length)
  })

  test('coverage floor: low-coverage INCI suppresses computed_score tags', () => {
    // INCI of mostly-unknown filler ingredients with one canonical actif.
    // Coverage will be very low (≤ 0.3); computed mapped tags must not fire.
    const inci =
      'Acme XR-7, Synthetic Polymer Z, Proprietary Blend Q, Mystery Filler 12, Niacinamide'
    const tags = detectAutoTags(inci, 'serum')
    const computedSlugs = tags.filter((t) => t.source === 'computed_score').map((t) => t.slug)
    // Niacinamide alone would normally fire acne-imperfections / pores-sebum / sebo-regulateur,
    // but at < 30 % coverage these are suppressed.
    expect(computedSlugs).not.toContain(S.ACNE_IMPERFECTIONS)
    expect(computedSlugs).not.toContain(S.PORES_SEBUM)
    expect(computedSlugs).not.toContain(S.SEBO_REGULATEUR)
  })

  test('coverage floor: disableFloors yields >= the default-floor candidate count', () => {
    const inci =
      'Acme XR-7, Synthetic Polymer Z, Proprietary Blend Q, Mystery Filler 12, Niacinamide'
    const baseline = detectAutoTags(inci, 'serum').filter((t) => t.source === 'computed_score')
    const bypassed = detectAutoTags(inci, 'serum', { disableFloors: true }).filter(
      (t) => t.source === 'computed_score'
    )
    // Bypassing floors can only let through additional candidates; never fewer.
    expect(bypassed.length).toBeGreaterThanOrEqual(baseline.length)
  })

  test('TAG_CONFIG counts match calibration', () => {
    // Hard-counted to flag any accidental flip in TAG_CONFIG.
    const allow = Object.values(TAG_CONFIG).filter((r) => r.allow)
    const drop = Object.values(TAG_CONFIG).filter((r) => !r.allow)
    expect(allow.length).toBe(15)
    expect(drop.length).toBe(16)
  })

  test('T2 non_irritant: recognized gentle INCI emits non-irritant', () => {
    // Algo-derm fires `non_irritant` on `irritation.risk < 0.35` with
    // `irritation.confidence` proportional to how many ingredients carry
    // irritation evidence. INCI of canonical low-risk actives gives
    // confidence ≈ 1.0 → passes Aurore's confidenceFloor 0.85 + coverageFloor 0.7 gate.
    const inci = 'Aqua, Glycerin, Niacinamide, Tocopherol, Sodium Hyaluronate'
    const slugs = new Set(detectAutoTags(inci, 'serum').map((t) => t.slug))
    expect(slugs.has(S.NON_IRRITANT)).toBe(true)
  })

  test('T2 non_irritant: leave-on with SLS + fragrance does not emit non-irritant', () => {
    // Sodium lauryl sulfate + parfum + 2 EU 26 allergens push leave-on
    // irritation.risk above 0.35 → algo-derm sets `present: false` at the
    // source.
    const inci = 'Aqua, Sodium Lauryl Sulfate, Parfum, Limonene, Linalool'
    const slugs = new Set(detectAutoTags(inci, 'moisturizer').map((t) => t.slug))
    expect(slugs.has(S.NON_IRRITANT)).toBe(false)
  })

  test('R3 per-tag coverageMin: non-comedogene needs ≥ 0.60 coverage', () => {
    // INCI dominated by unknown fillers — coverage will sit between the global
    // floor (0.30) and the non-comedogene floor (0.60). Other computed tags
    // pass through, but non-comedogene must not.
    const inci = 'Aqua, Acme XR-7, Synthetic Polymer Z, Proprietary Blend Q, Glycerin, Niacinamide'
    const slugs = new Set(detectAutoTags(inci, 'serum').map((t) => t.slug))
    expect(slugs.has(S.NON_COMEDOGENE)).toBe(false)
  })

  test('R3 disableFloors bypasses both coverage and confidence floors', () => {
    // Same low-coverage INCI — bypassing floors must be at least as permissive
    // as the gated baseline. `disableFloors` skips both coverageFloor and
    // confidenceFloor (per-tag + global), so non-comedogene can surface even
    // when comedogenicity.confidence < 0.90.
    const inci = 'Aqua, Acme XR-7, Synthetic Polymer Z, Proprietary Blend Q, Glycerin, Niacinamide'
    const slugs = new Set(detectAutoTags(inci, 'serum', { disableFloors: true }).map((t) => t.slug))
    const baselineSlugs = new Set(detectAutoTags(inci, 'serum').map((t) => t.slug))
    for (const slug of baselineSlugs) expect(slugs.has(slug)).toBe(true)
  })

  test('purifiant never emitted, sebo-regulateur still emitted on shared trigger', () => {
    // Salicylic acid fires both purifiant and sebo-regulateur in algo-derm;
    // only sebo-regulateur should make it through.
    const inci = 'Aqua, Salicylic Acid, Niacinamide, Glycerin'
    const slugs = new Set(detectAutoTags(inci, 'serum').map((t) => t.slug))
    expect(slugs.has(S.PURIFIANT)).toBe(false)
    expect(slugs.has(S.SEBO_REGULATEUR)).toBe(true)
  })

  test('dropCounts hook: populates `<reason>:<tagId>` when provided', () => {
    // This INCI fills multiple drop buckets: allow:false tags (sans_savon)
    // → disallowed; algo-derm candidates that come back present:false
    // → not_present (since TAG_DEFS v10, purifiant lands here too — a BHA at
    // unknown pH is gated to present:false rather than reaching the disallowed
    // check). Assert both buckets fire without pinning an id — v10 gating
    // shifts specific ids between buckets.
    const inci = 'Aqua, Salicylic Acid, Niacinamide, Glycerin'
    const drops = new Map<string, number>()
    detectAutoTags(inci, 'serum', { dropCounts: drops })
    expect(drops.size).toBeGreaterThan(0)
    const hasDisallowed = [...drops.keys()].some((k) => k.startsWith('disallowed:'))
    expect(hasDisallowed).toBe(true)
    const hasNotPresent = [...drops.keys()].some((k) => k.startsWith('not_present:'))
    expect(hasNotPresent).toBe(true)
  })

  test('T1 absence family: clean INCI emits silicones/HE/min-oil/allergens on leave-on', () => {
    // No SLS, no dimethicone, no essential oils, no petrolatum, no EU 26 allergens.
    // Coverage ≥ 0.7 → coverageFloor 0.7 gate passes for the four ungated absence
    // tags. sans-sulfates is formulaType-gated on leave-on (see next test).
    const inci = 'Aqua, Glycerin, Niacinamide, Sodium Hyaluronate, Tocopherol, Panthenol'
    const slugs = new Set(detectAutoTags(inci, 'serum').map((t) => t.slug))
    expect(slugs.has(S.SANS_SILICONES)).toBe(true)
    expect(slugs.has(S.SANS_HUILES_ESSENTIELLES)).toBe(true)
    expect(slugs.has(S.SANS_HUILES_MINERALES)).toBe(true)
    expect(slugs.has(S.SANS_ALLERGENES_PARFUMANTS)).toBe(true)
  })

  test('T1 sans-sulfates formulaType gate (TAG_DEFS v22): leave-on dropped, cleanser kept', () => {
    // A sulfate-free serum carries no signal (a serum is never sulfate-based), so
    // algo-derm downgrades the trivially-true claim to insufficient_data and it
    // drops here as not_present; on a cleanser, where a sulfate surfactant is a
    // real cleansing-system choice, the absence claim survives.
    const inci = 'Aqua, Glycerin, Niacinamide, Sodium Hyaluronate, Tocopherol, Panthenol'
    const leaveOn = new Set(detectAutoTags(inci, 'serum').map((t) => t.slug))
    const rinseOff = new Set(detectAutoTags(inci, 'cleanser').map((t) => t.slug))
    expect(leaveOn.has(S.SANS_SULFATES)).toBe(false)
    expect(rinseOff.has(S.SANS_SULFATES)).toBe(true)
  })

  test('T1 sans-sulfates: SLS in INCI suppresses tag', () => {
    const inci = 'Aqua, Sodium Lauryl Sulfate, Glycerin, Cocamidopropyl Betaine'
    const slugs = new Set(detectAutoTags(inci, 'cleanser').map((t) => t.slug))
    expect(slugs.has(S.SANS_SULFATES)).toBe(false)
  })

  test('T1 sans-silicones: dimethicone in INCI suppresses tag', () => {
    const inci = 'Aqua, Glycerin, Dimethicone, Cyclopentasiloxane, Tocopherol'
    const slugs = new Set(detectAutoTags(inci, 'moisturizer').map((t) => t.slug))
    expect(slugs.has(S.SANS_SILICONES)).toBe(false)
  })

  test('T1 sans-huiles-essentielles: lavender oil suppresses tag', () => {
    // Algo-derm `essential_oil` heuristic flags Lavandula angustifolia oil.
    const inci = 'Aqua, Glycerin, Lavandula Angustifolia Oil, Tocopherol'
    const slugs = new Set(detectAutoTags(inci, 'serum').map((t) => t.slug))
    expect(slugs.has(S.SANS_HUILES_ESSENTIELLES)).toBe(false)
  })

  test('T1 sans-huiles-minerales: petrolatum in INCI suppresses tag', () => {
    const inci = 'Aqua, Petrolatum, Glycerin, Tocopherol'
    const slugs = new Set(detectAutoTags(inci, 'moisturizer').map((t) => t.slug))
    expect(slugs.has(S.SANS_HUILES_MINERALES)).toBe(false)
  })

  test('T1 sans-allergenes-parfumants: limonene in INCI suppresses tag', () => {
    const inci = 'Aqua, Glycerin, Parfum, Limonene, Linalool'
    const slugs = new Set(detectAutoTags(inci, 'serum').map((t) => t.slug))
    expect(slugs.has(S.SANS_ALLERGENES_PARFUMANTS)).toBe(false)
  })

  test('dropCounts hook: rinse-off comedogene drop labelled rinse_off_excluded', () => {
    // Coconut oil + cleanser kind trips excludeRinseOff after low_confidence
    // and coverage_floor pass — assert the right reason label.
    const inci = 'Aqua, Coconut Oil, Glycerin'
    const drops = new Map<string, number>()
    detectAutoTags(inci, 'cleanser', { dropCounts: drops })
    expect(drops.get('rinse_off_excluded:comedogene')).toBe(1)
  })
})
