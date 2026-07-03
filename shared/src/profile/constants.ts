import { HTTP_STATUS, type HttpStatus } from '../core'

// Zod-free profile constants. Kept out of ./index (which pulls zod) so boot
// code reading these limits/slug lists stays off the zod critical path.

export const USERNAME_MAX_LENGTH = 32
export const BIO_MAX_LENGTH = 500

// These values are tag slugs from the `skin_type` category in the tags table.
// They must stay in sync with seed-tags.ts.
export const SKIN_TYPES = [
  'peau-seche',
  'peau-mixte',
  'peau-grasse',
  'peau-normale',
  'peau-sensible',
] as const

// User-facing concern slugs shown in the dermo profile UI. Distinct from the
// product tag `concern` taxonomy (see USER_CONCERN_TO_PRODUCT_TAGS for the
// translation): user vocab favors lay terms ("anti-acne") while product tags
// use clinical names ("acne-imperfections").
// Excluded: `lumiere-bleue`, `pollution`, `photo-protection`. Marketing
// claims, not user conditions.
export const SKIN_CONCERNS = [
  'anti-rougeurs',
  'rosacee',
  'couperose',
  'flushs',
  'barriere-cutanee',
  'anti-taches',
  'anti-acne',
  'anti-age',
  'hyperpigmentation',
  'deshydratation',
  'pores-dilates',
  'cernes-poches',
  'brillance',
  'eclat',
  'post-acne',
  'cicatrisation',
  'photo-vieillissement',
  'teint-terne',
  'repulpant',
  'eczema',
  'grain-peau',
  'keratose-pilaire',
] as const

export type SkinType = (typeof SKIN_TYPES)[number]
export type SkinConcern = (typeof SKIN_CONCERNS)[number]

// `username` is unique. A collision must surface as a clean 409, never an
// unhandled 500: a 500-vs-200 split lets an authenticated peer probe username
// existence (including private profiles, hidden from the public lookup).
export type ProfileErrorCode = 'username_taken'

export const profileErrorMapping = {
  username_taken: HTTP_STATUS.CONFLICT,
} as const satisfies Record<ProfileErrorCode, HttpStatus>
