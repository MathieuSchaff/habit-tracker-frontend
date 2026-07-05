import type { ProductKind } from '@aurore/shared'
import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@aurore/shared'

import { resolveIngredients } from '../../lib/ingredient-resolver'

const S = SKINCARE_PRODUCT_TAG_SLUGS

// "Sans savon" only discriminates on cleansing products: soap is a cleansing base,
// so its absence is meaningful here and vacuous on leave-on formulas (a serum is
// trivially soap-free). algo-derm fires the label catalogue-wide (>80%, non-
// discriminating) and stays allow:false; the claim is re-emitted here, kind-gated
// (same drop+replace boundary as ADR-0004 positioning gates).
const CLEANSING_KINDS = new Set<ProductKind>(['cleanser', 'body-wash', 'body-scrub'])

// True soap = alkali-metal salt of a fatty acid (saponified oil). The salt names
// (-ate directly on the acid/oil root) are what to look for. The alkali prefix is
// required so fatty-acid *esters* (glyceryl stearate, isopropyl myristate) and
// acyl *syndets* (-oyl: sodium cocoYL isethionate, sodium lauroYL sarcosinate)
// are NOT mistaken for soap.
const SOAP_SALT =
  /\b(?:sodium|potassium)\s+(?:[a-z]+\s+)?(?:cocoate|palmate|palmitate|stearate|laurate|myristate|oleate|tallowate|olivate|babassuate|kernelate|butterate|seedate)\b/
// Cold-process / handmade soap lists the saponified form explicitly.
const SOAP_OTHER = /saponif|\bsoap\b|\bsavon\b/

function hasSoap(ingredients: readonly string[]): boolean {
  return ingredients.some((ingredient) => SOAP_SALT.test(ingredient) || SOAP_OTHER.test(ingredient))
}

export function detectSansSavon(
  inci: string | null | undefined,
  kind: ProductKind,
  hoistedIngredients?: readonly string[]
): SkincareProductTagSlug[] {
  if (!CLEANSING_KINDS.has(kind)) return []
  const ingredients = resolveIngredients(inci, hoistedIngredients)
  // No INCI = no evidence of absence; never claim soap-free blind.
  if (ingredients.length === 0) return []
  if (hasSoap(ingredients)) return []
  return [S.SANS_SAVON]
}
