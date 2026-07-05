import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@aurore/shared'

import { matchesNamePositioning } from './pass-helpers'

const S = SKINCARE_PRODUCT_TAG_SLUGS

// Positioning gate for `apaisant` (re-emits an algo-derm slug, ADR-0004).
// algo-derm fires on ubiquitous soothing actives (panthenol, allantoin, centella)
// present in nearly every gentle product. But bare "apaisant" is as generic as
// "hydratant": it appears in boilerplate ingredient
// copy on products positioned for something else entirely. The gate is a PROXIMITY
// gate — soothing vocab must sit within 3 tokens of a product-type word (either order),
// i.e. the product names itself as soothing care, or explicit anti-redness positioning.
const PRODUCT_TYPE =
  'soin|cr[eè]me|cream|gel|baume|balm|lotion|fluide|s[eé]rum|serum|masque|mask|tonique|toner|pad|ampoule|brume|mist|spray|patch|huile|lait|wash|pack|essence'
const SOOTHE = 'apais|soothing|calming|calmant'

// `\S+` (not `\w+`) for the filler tokens: JS regex has no `u` flag here, so `\w`
// excludes accented chars and would break proximity across a French filler word.
export const APAISANT_POSITION_RE = new RegExp(
  `(?:${PRODUCT_TYPE})\\s+(?:\\S+\\s+){0,3}(?:${SOOTHE})` +
    `|(?:${SOOTHE})\\w*\\s+(?:\\S+\\s+){0,3}(?:${PRODUCT_TYPE})` +
    '|anti[-\\s]?rougeurs',
  'i'
)

// Foaming cleansers and brightening/moisture-hero products mention soothing as a
// secondary effect. Each token verified recall-safe (0 gold-positive hits).
export const APAISANT_EXCLUSION_RE = /gel moussant|brightening|deep moisture/i

export function detectApaisantFromName(
  name: string | null | undefined,
  description: string | null | undefined
): SkincareProductTagSlug[] {
  return matchesNamePositioning(name, description, APAISANT_POSITION_RE, APAISANT_EXCLUSION_RE)
    ? [S.APAISANT]
    : []
}
