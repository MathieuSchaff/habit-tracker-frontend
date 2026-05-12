import type { ProductKind } from '@habit-tracker/shared'
import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@habit-tracker/shared'

import { resolveIngredients } from '../../lib/ingredient-resolver'

const S = SKINCARE_PRODUCT_TAG_SLUGS

// Repulpant
// Plumping claim — hydrate-fill-smooth lines. Algo-derm `repulpant` was
// previously emitted at minConf 0.5 on 78 % of corpus (any HA/glycerin
// moisturizer) and disabled (auto-tag-detection.ts allow:false). This
// formula-pass detector restricts emission to formulas with all three
// signals co-present:
//
//   - Hyaluronate (any variant — substring `hyaluron`) in top 8 INCI.
//     Plumping peptide serums dose the peptide as headline actif (pos 3-6)
//     and HA as supporting humectant (pos 5-8). Top 8 is the functional
//     bound — past that, HA is texture polish trace.
//   - Pure glycerin (exact token, not `glyceryl stearate` or other esters)
//     in top 5. Confirms the humectant base behind HA.
//   - At least one canonical plumping peptide anywhere in INCI:
//     `acetyl hexapeptide-8` (Argireline — neuromodulator) or
//     `palmitoyl tripeptide-1` (signaling peptide for collagen). Both
//     are dosed mg-range, sit deep in INCI; presence ≥ 1 = formulary
//     intent (clinical INCI declarations require minimum 0.001 % dose).
//
// Leave-on only. Algo-derm `repulpant` stays `allow:false` — same
// cohabitation pattern as `peaux_atopiques` / eczema-atopie.

const REPULPANT_HA_PATTERN = 'hyaluron'
const REPULPANT_HA_POSITION_CAP = 8
const REPULPANT_GLYCERIN_TOKEN = 'glycerin'
const REPULPANT_GLYCERIN_POSITION_CAP = 5
const REPULPANT_PEPTIDE_PATTERNS = ['acetyl hexapeptide-8', 'palmitoyl tripeptide-1']

const REPULPANT_RINSE_OFF_KINDS = new Set<ProductKind>([
  'cleanser',
  'shampoo',
  'conditioner',
  'body-wash',
  'body-scrub',
  'mouthwash',
])

export function detectRepulpant(
  inci: string | null | undefined,
  kind: ProductKind,
  hoistedIngredients?: readonly string[]
): SkincareProductTagSlug[] {
  if (REPULPANT_RINSE_OFF_KINDS.has(kind)) return []
  const ingredients = resolveIngredients(inci, hoistedIngredients)
  if (ingredients.length === 0) return []

  // HA top 3
  const haCap = Math.min(ingredients.length, REPULPANT_HA_POSITION_CAP)
  let haFound = false
  for (let i = 0; i < haCap; i++) {
    if (ingredients[i].includes(REPULPANT_HA_PATTERN)) {
      haFound = true
      break
    }
  }
  if (!haFound) return []

  // Pure glycerin top 5 (exact token: glyceryl-stearate / glyceryl-cocoate
  // are esters, not the humectant)
  const glyCap = Math.min(ingredients.length, REPULPANT_GLYCERIN_POSITION_CAP)
  let glycerinFound = false
  for (let i = 0; i < glyCap; i++) {
    if (ingredients[i] === REPULPANT_GLYCERIN_TOKEN) {
      glycerinFound = true
      break
    }
  }
  if (!glycerinFound) return []

  // At least one plumping peptide anywhere
  const peptideFound = ingredients.some((ing) =>
    REPULPANT_PEPTIDE_PATTERNS.some((p) => ing.includes(p))
  )
  if (!peptideFound) return []

  return [S.REPULPANT]
}
