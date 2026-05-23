// Deterministic kind → product tag mapping. 1:1 (with shared TYPE_* targets):
// every `products.kind` value maps to a fixed list of `SkincareProductTagSlug`
// where index 0 is always the headline TYPE_* slug. Consumed by the backend
// orchestrator: `detectKindTags` (secondary auto-tags) and
// `detectKindPrimaryType` (primary promotion).
//
// Single source of truth — adding a kind without a row here means it gets no
// type tag and is invisible to TYPE_* filters.

import type { ProductKind } from './kinds'
import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from './skincare/tag-slugs'

const S = SKINCARE_PRODUCT_TAG_SLUGS

const KIND_TO_TAGS: Partial<Record<ProductKind, SkincareProductTagSlug[]>> = {
  // Face skincare
  serum: [S.TYPE_SERUM, S.STEP_TRAITEMENT, S.ZONE_VISAGE],
  moisturizer: [S.TYPE_HYDRATANT, S.STEP_HYDRATATION, S.ZONE_VISAGE],
  cleanser: [S.TYPE_NETTOYANT, S.STEP_NETTOYAGE_2, S.ZONE_VISAGE],
  toner: [S.TYPE_TONER, S.STEP_PREPARATION, S.ZONE_VISAGE, S.TEXTURE_EAU],
  exfoliant: [S.TYPE_EXFOLIATION, S.STEP_TRAITEMENT, S.ZONE_VISAGE],
  'eye-cream': [S.TYPE_TRAITEMENT, S.ZONE_YEUX],
  mask: [S.TYPE_MASQUE, S.MOMENT_HEBDOMADAIRE, S.ZONE_VISAGE],
  mist: [S.TYPE_MIST, S.STEP_PREPARATION, S.ZONE_VISAGE, S.TEXTURE_EAU],
  essence: [S.TYPE_TONER, S.STEP_PREPARATION, S.ZONE_VISAGE],
  'spot-treatment': [S.TYPE_TRAITEMENT, S.MOMENT_USAGE_LOCALISE, S.ZONE_VISAGE],
  'lip-care': [S.TYPE_TRAITEMENT, S.ZONE_LEVRES],
  // texture-riche removed: kind=balm alone is not enough — silicone/glycerin
  // balms (e.g. cica balms) have a cream-like feel. Defer to detectTextureRiche
  // (≥ 2 butter/wax top 8 INCI signal) so true heavy balms still tag.
  balm: [S.TYPE_HYDRATANT, S.TEXTURE_BAUME],
  oil: [S.TYPE_SERUM, S.TEXTURE_HUILE, S.STEP_HYDRATATION, S.ZONE_VISAGE],
  primer: [S.TYPE_PRIMER, S.MOMENT_MATIN, S.ZONE_VISAGE],
  patch: [S.TYPE_MASQUE, S.TEXTURE_PATCH],
  // Solaire
  sunscreen: [S.TYPE_SOLAIRE, S.STEP_PROTECTION_SOLAIRE, S.MOMENT_MATIN, S.ZONE_VISAGE],
  'after-sun': [S.TYPE_HYDRATANT, S.ZONE_CORPS],
  'self-tanner': [S.TYPE_SOLAIRE, S.ZONE_CORPS],
  // Bodycare
  'body-lotion': [S.TYPE_HYDRATANT, S.TEXTURE_LAIT, S.ZONE_CORPS],
  'body-oil': [S.TYPE_HYDRATANT, S.TEXTURE_HUILE, S.ZONE_CORPS],
  'body-scrub': [S.TYPE_EXFOLIATION, S.STEP_TRAITEMENT, S.ZONE_CORPS],
  'body-wash': [S.TYPE_NETTOYANT, S.ZONE_CORPS],
  deodorant: [S.TYPE_DEODORANT],
  'hand-cream': [S.TYPE_HYDRATANT, S.TEXTURE_CREME, S.ZONE_MAINS],
  'foot-cream': [S.TYPE_HYDRATANT, S.ZONE_PIEDS],
}

export function detectKindTags(kind: ProductKind): SkincareProductTagSlug[] {
  return KIND_TO_TAGS[kind] ?? []
}

// Headline tag for the product card. Convention: index 0 of each KIND_TO_TAGS
// entry is the TYPE_* slug (`type-serum`, `type-hydratant`, ...). When that
// holds, the orchestrator promotes this slug to `primary`.
export function detectKindPrimaryType(kind: ProductKind): SkincareProductTagSlug | null {
  const slugs = KIND_TO_TAGS[kind]
  const first = slugs?.[0]
  return first?.startsWith('type-') ? first : null
}
