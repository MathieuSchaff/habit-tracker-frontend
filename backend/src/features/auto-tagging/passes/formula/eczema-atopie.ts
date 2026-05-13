import type { ProductKind } from '@habit-tracker/shared'
import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@habit-tracker/shared'

import { resolveIngredients } from '../../lib/ingredient-resolver'

const S = SKINCARE_PRODUCT_TAG_SLUGS

import { IONIC_SURFACTANT_PATTERNS } from './step-nettoyage-1'

// Eczema-atopie
// Atopic-friendly formula. Two triggers:
//   A) `avena sativa kernel` anywhere in INCI — colloidal oatmeal (kernel
//      flour / kernel extract / kernel oil) is the FDA-recognized OTC skin
//      protectant for eczema (avenanthramides + beta-glucans). `avena sativa
//      flower/leaf/stem juice` is excluded: different botanical part, not
//      OTC-recognized, common as a generic soothing actif in non-AD products.
//   B) ≥ 2 distinct ceramide variants in top 12 AND 0 fragrance keyword AND
//      0 ionic sulfate surfactant in top 5. Single ceramide is hydration
//      polish; pairs target stratum-corneum lipid replenishment (CeraVe,
//      Avène Tolerance, La Roche-Posay Lipikar). Fragrance is the most-cited
//      AD flare trigger — exclude any `parfum`/`fragrance`/`aroma` declaration.
//      Sulfates are barrier-disrupting on AD-prone skin.
//
// Leave-on only: rinse-off contact time too short for either pathway to matter
// (Lodén 2003 on cumulative surfactant exposure; oat OTC label requires
// "leave on the affected area" usage).
//
// Replaces algo-derm `peaux_atopiques` mapping (fired on 22 % corpus / 3 %
// agree, too permissive). The algo-derm slug has no TAG_CONFIG entry — its
// candidate is dropped as `unmapped`. Original detector landed in f3fd5e2f;
// split into passes/formula/ at 211219d5.

const ATOPIE_OAT_PATTERN = 'avena sativa kernel'

// Mirror actif-class CERAMIDES patterns (single source of truth would import
// ACTIF_CLASS_DEFS, but coupling is heavier than the duplication cost — these
// patterns are stable taxonomy). Keep aligned with actif-class-detection.ts.
const ATOPIE_CERAMIDE_PATTERNS = [
  'ceramide np',
  'ceramide ap',
  'ceramide ns',
  'ceramide ng',
  'ceramide as',
  'ceramide eop',
  'ceramide eos',
  'ceramide 1',
  'ceramide 2',
  'ceramide 3',
  'ceramide 6',
]

// Functional concentration: ceramides past pos 12 are dosage trace, not the
// CeraVe-style relipidant claim eczema-friendly formulas are built around.
const ATOPIE_CERAMIDE_POSITION_CAP = 12

// Substring match: the slash-form `PARFUM/FRAGRANCE` normalizes to a single
// `parfum fragrance` token (algo-derm parser collapses `/` to space), which
// would slip past an exact-match check. `aroma` substring carries minimal
// FP risk — no common INCI ingredient embeds it as a substring.
const ATOPIE_FRAGRANCE_PATTERNS = ['parfum', 'fragrance', 'aroma']

const ATOPIE_SULFATE_POSITION_CAP = 5

const ATOPIE_RINSE_OFF_KINDS = new Set<ProductKind>([
  'cleanser',
  'shampoo',
  'conditioner',
  'body-wash',
  'body-scrub',
  'mouthwash',
])

export function detectEczemaAtopie(
  inci: string | null | undefined,
  kind: ProductKind,
  hoistedIngredients?: readonly string[]
): SkincareProductTagSlug[] {
  if (ATOPIE_RINSE_OFF_KINDS.has(kind)) return []
  const ingredients = resolveIngredients(inci, hoistedIngredients)
  if (ingredients.length === 0) return []

  // Trigger A: oatmeal anywhere → atopie-friendly regardless of other actifs
  if (ingredients.some((ing) => ing.includes(ATOPIE_OAT_PATTERN))) {
    return [S.ECZEMA_ATOPIE]
  }

  // Trigger B: ceramide relipidant pair + fragrance-free + no sulfate top 5
  const ceramideCap = Math.min(ingredients.length, ATOPIE_CERAMIDE_POSITION_CAP)
  let ceramideHits = 0
  for (let i = 0; i < ceramideCap; i++) {
    if (ATOPIE_CERAMIDE_PATTERNS.some((p) => ingredients[i].includes(p))) {
      ceramideHits++
      if (ceramideHits >= 2) break
    }
  }
  if (ceramideHits < 2) return []

  if (ingredients.some((ing) => ATOPIE_FRAGRANCE_PATTERNS.some((p) => ing.includes(p)))) {
    return []
  }

  const sulfateCap = Math.min(ingredients.length, ATOPIE_SULFATE_POSITION_CAP)
  for (let i = 0; i < sulfateCap; i++) {
    if (IONIC_SURFACTANT_PATTERNS.some((p) => ingredients[i].includes(p))) return []
  }

  return [S.ECZEMA_ATOPIE]
}
