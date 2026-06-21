// INCI-derived auto-tag detection for skincare products via algo-derm.
//
// Single source of truth for the per-tag policy used by:
//   - `db/seed/seeders/seed-core.ts` (initial seed)
//   - `runners/audit/main.ts` (dry-run report)
//   - `runners/backfill/main.ts` (post-snapshot rehydrate)
//
// `tagProduct` from algo-derm (TAG_DEFS_VERSION 7) emits 38 candidate tags.
// 29 are mapped + kept after calibration (snapshot 2026-05-07, N=1853 products
// with INCI). The rest drop: they fire on > 50 % of the corpus (`sans-savon`),
// are re-emitted with chemistry-aware gating by a formula pass (`matifiant`,
// `repulpant`, `eczema-atopie`), are redundant with the actif-class clusters
// (`keratolytique` → AHA/BHA/RETINOIDS), or are false precision on a claim
// INCI can't verify (`vegan` → brand-cert only).

import type { ProductKind } from '@aurore/shared'
import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@aurore/shared'

import {
  analyzeINCI,
  type ProductAssessment,
  splitINCI,
  TAG_DEFS_VERSION,
  tagProduct,
} from 'algo-derm'

import { mapKindToContext, RINSE_OFF_KINDS } from '../../../lib/algo-derm-product-context'

const S = SKINCARE_PRODUCT_TAG_SLUGS

// Calibration version guard. Fails fast at module load to prevent silent drift
// when a new algo-derm tarball changes tag semantics. Bump after re-running
// `just audit-auto-tags` and confirming per-tag floors still hold.
//
//   v2 (2026-05-13): MAPPED_TAGS check signature gained NormalizedIngredients
//                      (ordered + position helpers). Position caps added to
//                      `comedogene` (top 8), `anti-age` / `pores-sebum` /
//                      `sebo-regulateur` / `acne-imperfections` / etc. (top 12).
//   v3 (2026-05-13): `peaux_sensibles` excludes formaldehyde_donor +
//                      isothiazolinone (parity with peaux_atopiques).
//                      COMEDOGEN_PATTERNS enriched 4 → 12 (Fulton ≥ 3 list).
//   v4 (2026-05-13): `peau-mixte` tightened to seborrheicRegulation AND
//                      hydrating both ≥ 0.4 (was 0.25). No-op for Aurore
//                      (peau-mixte already absent from TAG_CONFIG → `unmapped`),
//                      but the version pin must match.
//   v5 (2026-05-13): Per-axis AXIS_BENEFIT_THRESHOLDS (B3). Uniform 0.35
//                      replaced by per-axis P85 over Aurore corpus (n=3601):
//                      soothing 0.20 / hydrating 0.47 / barrierSupport 0.25 /
//                      antioxidant 0.19 / brightening 0.21 /
//                      seborrheicRegulation 0.20. Eclat-teint-uniforme 0.30
//                      override dropped (relation hyperpigmentation ⊃ eclat
//                      now via active-list branch). Audit hit-rate drift on
//                      `apaisant` / `anti-oxydant` / `barriere-cutanee` /
//                      `eclat-teint-uniforme` expected; re-calibrate
//                      TAG_HIT_RATE_BUDGET after audit.
//   v6 (2026-05-13): Position-weighted confidence (B2). `anti-age` /
//                      `purifiant` / `keratolytique` / `repulpant` confidence
//                      now `min(coverage, 0.9) × positionConfidence(pos, cap)`.
//                      Runtime impact on Aurore is narrow: only `anti-age`
//                      reaches gating (confidenceFloor 0.5); `purifiant` is
//                      `allow:false`, `keratolytique` is unmapped, `repulpant`
//                      is re-emitted via passes/formula/. Anti-age hit rate
//                      may dip on products with retinol/vit-C at INCI pos > 5
//                      (~half confidence); re-baseline budgets if drift.
//   v7 (2026-05-14): `vegan` + `grossesse_risque` added (pregnancy and vegan
//                      detection migrated from Aurore formula passes to algo-derm).
//                      `grossesse-compatible` enriched with formaldehyde_donor
//                      exclusion. `ProductAssessment.context` exposed; sunscreen
//                      added to `formulaType` enum. Re-run `just audit-auto-tags`
//                      and re-baseline TAG_HIT_RATE_BUDGET if hit rates drift.
//   v8-v10 adopted 2026-05-26 in one reconcile (vendored 0.1.6 jumped v7→v10
//          unnoticed; the 0.1.6 bump shipped 1b/1c perf but also swept the
//          un-vendored honest-output + gating changes). Re-baselined budgets
//          after `DUMP_BUDGETS=1 just audit-auto-tags` on the v10 corpus.
//   v8: Low-risk/clean computed confidence falls back to coverage when the
//          risk axis has no drivers (was 0). Clean high-coverage formulas can
//          now clear the floor for hypoallergenique / peaux_sensibles /
//          peau-sensible / non-comedogene → those hit rates may rise.
//   v9: Honest-output contract. Every ProductTag gains `state`
//          (present|absent|insufficient_data), additive: the consumer reads
//          `present`/`confidence` only. Tolerance tags masked to present=false
//          when conf < 0.5 OR coverage < 0.6 (subsumed by Aurore's stricter
//          0.85/0.7 floors). `grossesse-compatible` is now the strict negation
//          of `grossesse_risque` + coverage ≥ 0.8; may drop in the 0.75-0.80
//          coverage band our floor (0.75) used to admit.
//   v10: Active-claim gating. anti-age / purifiant / keratolytique /
//          acne-imperfections report present=false on rinse-off (and on AHA/BHA
//          at pH ≥ 4 / unknown pH). Only anti-age + acne-imperfections are
//          allow:true here, so their rinse-off hit rate drops: this is the
//          part of the rinse-off concern FPs algo-derm fixes upstream;
//          Phase 2 handles the benefit-derived effect tags it doesn't gate.
//   v11 (2026-05-26): Phase 2 rinse-off effect-tag gating. protection /
//          anti-oxydant / apaisant / sebo-regulateur report present=false on
//          rinse-off (benefit-derived effects washed off a cleanser). All four
//          are allow:true here, so their rinse-off hit rate drops to 0;
//          re-baselined budgets after `DUMP_BUDGETS=1 just audit-auto-tags`.
//   v12 (2026-06-12): FP/FN cleanup batch. gateActiveClaim only gates when
//          the pH-acid carries the claim (BPO/urea keep tag at pH≥4); absence
//          tags with detected trigger → confidence 0.95 (not coverage-capped);
//          active-list mapped tags fall back to coverage confidence when no
//          benefit drivers; urea patterns word-anchored (preservative duos
//          don't fire keratolytique/deshydratation); vegan space-guarded
//          (caramel no longer denies via mel pattern). No tag set change →
//          budgets unchanged; re-baselined to confirm.
//   v13-v14 (2026-06-13): functional-role tags (`role:humectant` / `emollient`
//          / `surfactant` / `filmForming` / `occlusive`) emitted as
//          display/filter metadata, non-scoring. Unmapped in Aurore's
//          TAG_CONFIG → no-op for the consumer.
//   v15 (2026-06-13): tolerance tags `peaux_sensibles` / `peaux_atopiques` /
//          `peau-sensible` gate on the now-discriminant `dryness` axis
//          (< 0.5, post-ADR-0011). A defatting formula (alcohol/BPO/retinoid)
//          that slipped under irritation/allergenicity now turns the tolerance
//          claim absent. One-way conservative (only removes claims). Hit-rate
//          dip on those three expected; re-baseline TAG_HIT_RATE_BUDGET.
//   v16 (2026-06-13): dry-skin-suitability tags `peau-seche` (skin-type) and
//          `deshydratation` (concerns) also gate `dryness < 0.5`. Strong
//          defatting actives (retinoid/alcohol/AHA) drop the tag even when a
//          weak hydration benefit fired it; resolves lactic acid humectant-vs-
//          AHA dual role. `check`-only change (confidence untouched). Larger
//          flip count than v15; re-baseline both slugs.
//   v17 (2026-06-13): fix — reverts v15's `dryness` addition to
//          `lowRiskConfidence` for the three tolerance tags (back to
//          [irritation, allergenicity]). The dryness axis had zero per-axis
//          confidence when undriven, collapsing the min and masking gentle
//          partial-coverage formulas to insufficient_data. v15/v16 `check`
//          gates stay; tolerance tags wrongly masked report `present` again.
//   v18-v21 (2026-06-21): re-vendor — scoring decouple (v18) only moves
//          allow:false tags, duplicate drops (v19 protection, v20 reparateur)
//          re-emitted by formula passes. No emission change here; documented in
//          tag-budgets.ts (coverage-gain rebaseline of three minimal-headroom caps).
//   v22 (2026-06-21): absence tags `sans_sulfates` / `sans_savon` gate on
//          `context.formulaType` (relevantKinds = cleanser/gentle_cleanser).
//          On a known leave-on kind the trivially-true `present` claim downgrades
//          to insufficient_data → dropped here as `not_present`. sans_savon is
//          allow:false (no-op). sans_sulfates falls on leave-on skincare/solaire
//          (~2485 emissions), survives on cleanser + undefined-formulaType kinds
//          (body/lip/deodorant). Re-baseline sans-sulfates caps; CHECK stays
//          green (max-only caps, no min → a drop never breaches).
const CALIBRATED_FOR_TAG_DEFS_VERSION = 22

if (TAG_DEFS_VERSION !== CALIBRATED_FOR_TAG_DEFS_VERSION) {
  throw new Error(
    `algo-derm TAG_DEFS_VERSION=${TAG_DEFS_VERSION} but Aurore is calibrated for ` +
      `${CALIBRATED_FOR_TAG_DEFS_VERSION}. Re-run \`just audit-auto-tags\` and ` +
      `bump CALIBRATED_FOR_TAG_DEFS_VERSION in passes/algo-derm-detection.ts.`
  )
}

// Per-tag gating policy. Two independent floors:
//
// - `coverageFloor`: minimum `assessment.coverage.ratio`. For absence tags,
//   this is the only gate (algo-derm sets confidence = min(coverage, 0.95)).
//   For computed tags, stacks on top of `confidenceFloor` and overrides the
//   global COMPUTED_COVERAGE_FLOOR when set.
// - `confidenceFloor`: minimum `candidate.confidence`. Only meaningful for
//   computed_score; absence tags have confidence ≡ coverage by construction.
//
// This split replaces the legacy `minConf` field whose semantics silently
// changed per source (absence: coverage floor; computed: confidence floor).
export type TagRule = {
  // Absent only for allow:false entries with no Aurore counterpart (e.g. `keratolytique`).
  auroreSlug?: SkincareProductTagSlug
  allow: boolean
  // Defaults to 'secondary'. Set to 'avoid' for safety signals so the
  // avoid > secondary dedup rule in the orchestrator applies automatically.
  relevance?: 'secondary' | 'avoid'
  // algo-derm ignores context.leaveOn on the comedogenicity axis; 29 % of
  // comedogene hits fire on rinse-off in the dry-run; filter here instead.
  excludeRinseOff?: boolean
  coverageFloor?: number
  confidenceFloor?: number
  // Post-floor predicate for assessment-derived disqualifiers that don't fit
  // numeric gates (e.g. declarationOnlyRisk: Annex III trace allergens
  // declared per regulation but at sub-effect levels). Predicate-based so a
  // slug rename doesn't silently break the gate.
  skipIf?: (a: ProductAssessment) => boolean
}

// Calibration buckets: allow @ 0.50 (agree >= 36 %); allow:false for
// structurally noisy tags; allow @ 0.85 + excludeRinseOff for comedogenicity;
// matifiant dropped despite small set size (semantic mismatch).
export const TAG_CONFIG: Readonly<Record<string, TagRule>> = {
  // peaux_atopiques / repulpant / matifiant are intentionally unmapped here:
  // algo-derm fires them on 22-78 % of corpus; formula detectors in passes/formula/
  // gate on chemistry-aware co-presence. Unmapped candidates are dropped: expected,
  // not drift. Boundary rule (map vs re-emit): ADR 0004.
  // Concerns (computed_score)
  // Unwired (ADR-0004, R5 2026-06-03): algo-derm fires on sebum/exfoliating actives in
  // the INCI regardless of positioning — P=0.250. Re-emitted by `formula:acne-imperfections-name`
  // (acne/blemish lexical field) → P=0.857, R=0.750.
  'acne-imperfections': { auroreSlug: S.ACNE_IMPERFECTIONS, confidenceFloor: 0.5, allow: false },
  // Unwired (ADR-0004, R5 2026-06-03): algo-derm keys on ubiquitous soothing
  // actives (allantoin/panthenol) and fires redness on foot creams/toners — gold
  // set P=0.025. Re-emitted by the positioning pass `formula:rougeurs-vasculaires-name`
  // (name/claim names a redness condition) → P=0.611, R=1.000.
  'rougeurs-vasculaires': {
    auroreSlug: S.ROUGEURS_VASCULAIRES,
    confidenceFloor: 0.5,
    allow: false,
  },
  // Unwired (ADR-0004, R5 2026-06-03): algo-derm fires on ubiquitous barrier actives
  // (ceramides/panthenol) and under-fires — P=0.333, R=0.130. Re-emitted by
  // `formula:barriere-cutanee-name` (réparateur/barrier positioning) → P=1.000, R=0.783.
  'barriere-cutanee': { auroreSlug: S.BARRIERE_CUTANEE, confidenceFloor: 0.5, allow: false },
  // Unwired (ADR-0004, R5 2026-06-03): all four fired on brightening / sebum /
  // humectant actives present in INCI regardless of positioning (P 0.05–0.18).
  // Re-emitted by name/claim positioning passes (formula:{hyperpigmentation,
  // eclat-teint,pores-sebum,deshydratation}-name) → P 0.80–0.91. See R5.
  hyperpigmentation: { auroreSlug: S.HYPERPIGMENTATION, confidenceFloor: 0.5, allow: false },
  'eclat-teint-uniforme': { auroreSlug: S.ECLAT_TEINT, confidenceFloor: 0.5, allow: false },
  // Unwired (ADR-0004, R5 2026-06-03): algo-derm fires on anti-age actives (retinoids,
  // peptides, vitamin C) across the catalogue regardless of positioning — P=0.310. Re-emitted
  // by `formula:anti-age-name` (retinoid family + anti-âge/anti-rides claims) → P=0.933, R=0.944.
  'anti-age': { auroreSlug: S.ANTI_AGE, confidenceFloor: 0.5, allow: false },
  'pores-sebum': { auroreSlug: S.PORES_SEBUM, confidenceFloor: 0.5, allow: false },
  deshydratation: { auroreSlug: S.DESHYDRATATION, confidenceFloor: 0.85, allow: false },

  // Skin effects
  // Unwired (ADR-0004, R5 2026-06-03): algo-derm fires on ubiquitous soothing actives
  // (panthenol/allantoin/centella) — P=0.542, R=0.076. Re-emitted by `formula:apaisant-name`,
  // a proximity gate (soothing vocab next to a product-type word) → P=1.000, R=0.871.
  apaisant: { auroreSlug: S.APAISANT, confidenceFloor: 0.5, allow: false },
  'sebo-regulateur': { auroreSlug: S.SEBO_REGULATEUR, confidenceFloor: 0.5, allow: true },
  // Unwired (2026-06-13, ADR-0004): algo-derm fires on antioxidant actives
  // (tocopherol, ascorbic, ferulic) present in nearly every emulsion regardless
  // of positioning — ~1348/4058 products. Its 0.5 confidence floor was a coverage
  // proxy, not a precision gate (algo-derm benefit confidence is the driver
  // evidence weight; a single A-evidence tocopherol clears it). Re-emitted by
  // `formula:anti-oxydant-name` (explicit antioxidant claim + unambiguous heroes).
  // Also absorbs the antioxidant meaning of the former `protection` candidate
  // (algo-derm dropped it as a duplicate in TAG_DEFS v19; UV meaning stays on
  // `formula:protection`). `reparateur` likewise dropped as a `barriere-cutanee`
  // duplicate in v20 — re-emitted by `formula:reparateur-name`.
  'anti-oxydant': { auroreSlug: S.ANTI_OXYDANT, confidenceFloor: 0.5, allow: false },
  // Strict subset of sebo-regulateur trigger (same minus niacinamide): any
  // purifiant product also fires sebo-regulateur. pores-sebum + sebo-regulateur
  // axes cover the ground without redundancy.
  purifiant: { auroreSlug: S.PURIFIANT, confidenceFloor: 1.0, allow: false },
  // Already surfaced by actif-class (BHA / AHA / RETINOIDS). No Aurore slug;
  // clinical term off-doctrine. Explicit drop (audit A4).
  keratolytique: { allow: false },

  // peau-mixte excluded: too noisy on neutral hydrators.
  // peaux_sensibles: strict computed variant, excludes sulfate/formaldehyde_donor/
  // isothiazolinone (the mapped peau-sensible tolerates them; axis gate only).
  peaux_sensibles: { auroreSlug: S.PEAU_SENSIBLE, confidenceFloor: 0.5, allow: true },
  // Unwired (2026-06-13, ADR-0004): the skin-type tags fired off a benefit-axis
  // confidence inflated corpus-wide by the v13-v17 scoring evolution (dryness floor,
  // inert-coverage recognition) — peau-grasse 26% / peau-seche 25% of skincare, the
  // two opposites both firing on half the catalogue = noise, not an audience claim.
  // No gold set exists for them to calibrate a confidence floor (0 / 1 annotations).
  // Re-emitted by `formula:peau-grasse-name` / `formula:peau-seche-name` on the
  // explicit marketed-for phrase in the name (precision ~1.0, conservative recall).
  'peau-grasse': { auroreSlug: S.PEAU_GRASSE, confidenceFloor: 0.85, allow: false },
  'peau-seche': { auroreSlug: S.PEAU_SECHE, confidenceFloor: 0.85, allow: false },

  // Absence tags (detected_absence): algo-derm sets confidence = min(coverage, 0.95).
  // Gate on coverageFloor only; confidenceFloor is redundant for absence tags.
  sans_parfum: { auroreSlug: S.SANS_PARFUM, coverageFloor: 0.7, allow: true },
  sans_sulfates: { auroreSlug: S.SANS_SULFATES, coverageFloor: 0.7, allow: true },
  sans_silicones: { auroreSlug: S.SANS_SILICONES, coverageFloor: 0.7, allow: true },
  sans_huiles_essentielles: {
    auroreSlug: S.SANS_HUILES_ESSENTIELLES,
    coverageFloor: 0.7,
    allow: true,
  },
  sans_huiles_minerales: {
    auroreSlug: S.SANS_HUILES_MINERALES,
    coverageFloor: 0.7,
    allow: true,
  },
  sans_allergenes_parfumants: {
    auroreSlug: S.SANS_ALLERGENES_PARFUMANTS,
    coverageFloor: 0.7,
    allow: true,
  },
  // Denatured alcohol (not simple ethanol co-solvent) is a chronic drying irritant;
  // its absence signals for sensitive/atopic skin unlike sans_savon (audit A2).
  sans_alcool_denature: {
    auroreSlug: S.SANS_ALCOOL_DENATURE,
    coverageFloor: 0.7,
    allow: true,
  },
  // Fires on > 80 % of corpus, not discriminating.
  sans_savon: { auroreSlug: S.SANS_SAVON, coverageFloor: 1.0, allow: false },

  // Fires on allergenicity.risk < 0.30 + no fragrance/EO/allergen flags.
  // Reactivated 2026-05-08 (T1.11). Floors require strong axis confidence
  // and substantial INCI coverage before claiming low allergenicity.
  hypoallergenique: {
    auroreSlug: S.HYPOALLERGENIQUE,
    confidenceFloor: 0.85,
    coverageFloor: 0.7,
    allow: true,
    // Currently unreachable: declarationOnlyRisk requires risk >= 0.33, which
    // algo-derm's < 0.30 fire threshold already excludes. Kept as a guard if
    // the upstream threshold ever loosens past 0.33.
    skipIf: (a) => a.declarationOnlyRisk,
  },
  // Fires on irritation.risk < 0.35. Mirrors hypoallergenique floors.
  // No skipIf: declarationOnlyRisk is allergenicity-specific (Annex III traces)
  // and has no irritation-axis equivalent in algo-derm.
  non_irritant: {
    auroreSlug: S.NON_IRRITANT,
    confidenceFloor: 0.85,
    coverageFloor: 0.7,
    allow: true,
  },
  // Checks retinoid/hydroquinone absence + pregnancy interactions. algo-derm
  // sets confidence = min(coverage, 0.85), so confidenceFloor 0.75 requires
  // >= 75 % INCI coverage in practice.
  'grossesse-compatible': {
    auroreSlug: S.GROSSESSE_COMPATIBLE,
    confidenceFloor: 0.75,
    allow: true,
  },

  // INCI absence is not a vegan signal: glycerin/squalane/stearic acid are
  // plant- or animal-derived with identical INCI names; heuristic fired on
  // 81-90 % of corpus. Brand-cert pass is the sole authoritative source for
  // the vegan slug (audit 2026-05-24).
  vegan: { auroreSlug: S.VEGAN, coverageFloor: 0.5, allow: false },

  // Explicit avoid signal: fires on retinoids, hydroquinone, formaldehyde donors,
  // BHA leave-on, oxybenzone/homosalate, risky EOs. Migrated from formula pass.
  // coverageFloor: 0; missing a contraindication is worse than a false positive.
  grossesse_risque: {
    auroreSlug: S.GROSSESSE_COMPATIBLE,
    relevance: 'avoid',
    coverageFloor: 0,
    allow: true,
  },

  // Leave-on only (§7.6).
  comedogene: {
    auroreSlug: S.COMEDOGENE,
    confidenceFloor: 0.85,
    allow: true,
    excludeRinseOff: true,
  },
  // Fires on comedogenicity.risk <= 0.25: emitted on > 60 % of corpus at 0.5.
  // R3: 0.90/0.60 floors require substantial INCI coverage before claiming
  // non-comedogenicity (a single humectant in 70 % unknown formula is not enough).
  'non-comedogene': {
    auroreSlug: S.NON_COMEDOGENE,
    confidenceFloor: 0.9,
    coverageFloor: 0.6,
    allow: true,
    excludeRinseOff: true,
  },
}

export interface DetectedAutoTag {
  slug: SkincareProductTagSlug
  relevance: 'secondary' | 'avoid'
  confidence: number
  source: 'detected_absence' | 'computed_score'
}

// Default coverage floor for computed_score candidates. Below 0.3, a single
// ingredient match in a mostly-unrecognized formula can trigger the tag.
// Absence tags default to 0; each sets its own coverageFloor explicitly.
const COMPUTED_COVERAGE_FLOOR = 0.3

export type DropReason =
  | 'not_present'
  | 'unmapped'
  | 'disallowed'
  | 'coverage_floor'
  | 'low_confidence'
  | 'rinse_off_excluded'
  | 'skip_if'

export interface DetectAutoTagsOptions {
  // Raises per-tag confidenceFloor globally (debug). Never lowers. Only affects
  // computed_score; absence tags use coverageMinOverride instead.
  confOverride?: number
  // Debug: surface allow:false tags. Never true at seed.
  includeDropped?: boolean
  // Raises per-tag coverageFloor globally (debug). Never lowers.
  coverageMinOverride?: number
  // Bypass both floor gates entirely. allow, excludeRinseOff, skipIf,
  // candidate.present, and unmapped checks still apply.
  disableFloors?: boolean
  // Pre-computed assessment from a hoisted analyzeINCI call. Must match
  // (inci, kind): caller responsibility.
  assessment?: ProductAssessment
  // Pre-split ingredient list; same hoisting rationale as assessment.
  ingredients?: string[]
  // Audit hook: bumps ${reason}:${candidate.id} for every dropped candidate.
  // Caller owns the Map. No-op in prod runners.
  dropCounts?: Map<string, number>
}

const bumpDrop = (
  map: Map<string, number> | undefined,
  reason: DropReason,
  tagId: string
): void => {
  if (!map) return
  const k = `${reason}:${tagId}`
  map.set(k, (map.get(k) ?? 0) + 1)
}

export function detectAutoTags(
  inci: string | null | undefined,
  kind: ProductKind,
  options: DetectAutoTagsOptions = {}
): DetectedAutoTag[] {
  if (!inci?.trim()) return []

  const ingredients = options.ingredients ?? splitINCI(inci)
  if (ingredients.length === 0) return []

  const assessment = options.assessment ?? analyzeINCI(inci, { context: mapKindToContext(kind) })
  const candidates = tagProduct(assessment, ingredients)
  const isRinseOff = RINSE_OFF_KINDS.has(kind)
  const coverageRatio = assessment.coverage.ratio

  const drops = options.dropCounts
  const results: DetectedAutoTag[] = []
  for (const candidate of candidates) {
    if (!candidate.present) {
      bumpDrop(drops, 'not_present', candidate.id)
      continue
    }
    const rule = TAG_CONFIG[candidate.id]
    if (!rule) {
      bumpDrop(drops, 'unmapped', candidate.id)
      continue
    }
    if (!rule.allow && !options.includeDropped) {
      bumpDrop(drops, 'disallowed', candidate.id)
      continue
    }

    if (!options.disableFloors) {
      const baseFloor =
        rule.coverageFloor ?? (candidate.source === 'computed_score' ? COMPUTED_COVERAGE_FLOOR : 0)
      const effectiveFloor = Math.max(baseFloor, options.coverageMinOverride ?? 0)
      if (coverageRatio < effectiveFloor) {
        bumpDrop(drops, 'coverage_floor', candidate.id)
        continue
      }
    }

    if (candidate.source === 'computed_score' && !options.disableFloors) {
      const baseFloor = rule.confidenceFloor ?? 0
      const effectiveFloor = Math.max(baseFloor, options.confOverride ?? 0)
      if (candidate.confidence < effectiveFloor) {
        bumpDrop(drops, 'low_confidence', candidate.id)
        continue
      }
    }

    if (rule.excludeRinseOff && isRinseOff) {
      bumpDrop(drops, 'rinse_off_excluded', candidate.id)
      continue
    }

    if (rule.skipIf?.(assessment)) {
      bumpDrop(drops, 'skip_if', candidate.id)
      continue
    }

    if (!rule.auroreSlug) continue
    results.push({
      slug: rule.auroreSlug,
      relevance: rule.relevance ?? 'secondary',
      confidence: candidate.confidence,
      source: candidate.source,
    })
  }
  return results
}
