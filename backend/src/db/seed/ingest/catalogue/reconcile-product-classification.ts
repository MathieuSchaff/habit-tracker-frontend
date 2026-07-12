import type { CreateProductInput, ProductCategory, ProductKind } from '@aurore/shared'

const RECONCILABLE_SKINCARE_KINDS = new Set<ProductKind>([
  'moisturizer',
  'serum',
  'essence',
  'mist',
  'oil',
])

// A cleansing oil imported as kind='oil' is tagged as a leave-on treatment oil
// (TYPE_SERUM/STEP_HYDRATATION) because the kind-tag map never reads the name.
// The name is the only signal that it rinses off.
const CLEANSING_OIL_NAME_RE =
  /\bcleansing\s+oil\b|\bd[ée]maquill(?:ant|ante)?\b|\bcleansing\s+balm\b|baume\s+d[ée]maquil|\bmakeup\s+remov|micellaire\s+d[ée]maquil/i

// These names have no reliable UV index, but their INCI was manually checked
// before the 2026-07 sunscreen backfill.
const CONFIRMED_SUNSCREEN_SLUGS = new Set([
  'dr-ceuracle-cica-regen-waterproof-sun',
  'missha-safe-block-rx-uv-cover-tone-up-sun',
  'dr-ceuracle-tea-tree-purifine-green-up-sun',
  'dr-ceuracle-hyal-reyouth-moist-sun',
  'svr-sun-secure-spray-hydratant-ultra-leger-et-invisible',
  'haruharu-wonder-black-bamboo-top-to-toe-spf-veil',
  'skin1004-madagascar-centella-hyalu-cica-water-fit-sun-serum-twin-pack',
  'skin1004-madagascar-centella-probio-cica-glow-sun-ampoule',
  'abib-heartleaf-sun-essence-calming-drop',
])

const SUNSCREEN_FORMAT_RE =
  /\bsun[ -]?(?:cream|screen|stick|milk)\b|\bécran\b|\bcr[eè]me solaire\b/i
const SUN_TERM_RE = /\bsun\b/i
const UV_INDEX_RE = /\b(?:spf|fps|ip)[\s:.-]*\d|\bpa\+/i
const SUNSCREEN_EXCLUSION_RE =
  /\bbb\b|cushion|after[- ]?sun|apr[eè]s[- ]?soleil|l[eè]vres?\b|\blips?\b|\beyes?\b|yeux/i

export interface ImportedProductClassificationInput {
  name: string | null
  slug: string | null
  inci: string | null
  category: string | null
  kind: string | null
}

export interface ImportedProductClassificationOverride {
  category: ProductCategory
  kind: ProductKind
  reason: 'sunscreen-name' | 'confirmed-sunscreen-slug' | 'cleansing-oil-name'
}

export interface AppliedImportedProductClassification {
  from: { category: string | null; kind: string | null }
  to: { category: ProductCategory; kind: ProductKind }
  reason: ImportedProductClassificationOverride['reason']
}

const stringOrNull = (value: unknown): string | null => (typeof value === 'string' ? value : null)

export function reconcileImportedProductClassification(
  input: ImportedProductClassificationInput
): ImportedProductClassificationOverride | null {
  if (
    input.category !== 'skincare' ||
    !RECONCILABLE_SKINCARE_KINDS.has(input.kind as ProductKind)
  ) {
    return null
  }

  if (input.slug && CONFIRMED_SUNSCREEN_SLUGS.has(input.slug)) {
    return { category: 'solaire', kind: 'sunscreen', reason: 'confirmed-sunscreen-slug' }
  }

  // Before the sunscreen exclusion gate: a "démaquillant yeux" legitimately
  // mentions "yeux". Only oil flips to cleanser; the other reconcilable kinds
  // keep their leave-on classification.
  if (input.kind === 'oil' && input.name && CLEANSING_OIL_NAME_RE.test(input.name)) {
    return { category: 'skincare', kind: 'cleanser', reason: 'cleansing-oil-name' }
  }

  if (!input.name || SUNSCREEN_EXCLUSION_RE.test(input.name)) return null

  const nameIdentifiesSunscreen =
    SUNSCREEN_FORMAT_RE.test(input.name) ||
    (SUN_TERM_RE.test(input.name) && UV_INDEX_RE.test(input.name))
  if (!nameIdentifiesSunscreen) return null

  return { category: 'solaire', kind: 'sunscreen', reason: 'sunscreen-name' }
}

export function applyImportedProductClassification(
  row: Record<string, unknown>,
  slug: string | null,
  verdict?: Partial<CreateProductInput>
): { row: Record<string, unknown>; reconciliation: AppliedImportedProductClassification | null } {
  const override = reconcileImportedProductClassification({
    name: stringOrNull(row.name),
    slug,
    inci: stringOrNull(row.inci),
    category: stringOrNull(row.category),
    kind: stringOrNull(row.kind),
  })
  const inferred = override ? { ...row, category: override.category, kind: override.kind } : row
  const merged = verdict ? { ...inferred, ...verdict } : inferred
  const reconciliation =
    override && merged.category === override.category && merged.kind === override.kind
      ? {
          from: {
            category: stringOrNull(row.category),
            kind: stringOrNull(row.kind),
          },
          to: { category: override.category, kind: override.kind },
          reason: override.reason,
        }
      : null

  return { row: merged, reconciliation }
}
