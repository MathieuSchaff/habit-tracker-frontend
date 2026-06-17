import { z } from 'zod'

import { HTTP_STATUS, type HttpStatus, safeUrl } from '../core'

// SCHEMAS

// profile

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
// Excluded: `lumiere-bleue`, `pollution`, `photo-protection` — marketing
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

const profileLinkSchema = z.object({
  label: z.string().min(1).max(50),
  url: safeUrl,
})

const profilePublicSchema = z.object({
  userId: z.uuid(),
  username: z.string().max(USERNAME_MAX_LENGTH).nullable().optional(),
  bio: z.string().max(BIO_MAX_LENGTH).nullable().optional(),
  avatarUrl: safeUrl.nullable().optional(),
  links: profileLinkSchema.array().optional().default([]),
  createdAt: z.iso.datetime().nullable().optional(),
  updatedAt: z.iso.datetime().nullable().optional(),
})

/* Strict mode — rejects unknown fields. All fields optional (delta update). */
export const profileUpdateSchema = z
  .object({
    username: z.string().min(1).max(USERNAME_MAX_LENGTH).optional(),
    bio: z.string().max(BIO_MAX_LENGTH).optional(),
    avatarUrl: safeUrl.optional(),
    links: profileLinkSchema.array().max(5).optional(),
  })
  .strict()

const userDermoProfileSchema = z.object({
  userId: z.uuid(),
  skinTypes: z.array(z.enum(SKIN_TYPES)).max(3).nullable(),
  fitzpatrickType: z.number().int().min(1).max(6).nullable(),
  // no upper bound — user can select any combination of concerns from the list
  skinConcerns: z.array(z.enum(SKIN_CONCERNS)),
  privateNotes: z.string().max(2000).nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

export const userDermoProfileUpdateSchema = z
  .object({
    skinTypes: z.array(z.enum(SKIN_TYPES)).max(3).optional(),
    fitzpatrickType: z.number().int().min(1).max(6).nullable().optional(),
    skinConcerns: z.array(z.enum(SKIN_CONCERNS)).optional(),
    privateNotes: z.string().max(2000).nullable().optional(),
  })
  .strict()

const profileStatsSchema = z.object({
  totalProducts: z.number(),
})

// privacy

// Master `profilePublic` gates all field-level flags: when false, no field is
// exposed regardless of its sub-flag. Username is implicit (URL identifier).
const privacySettingsSchema = z.object({
  profilePublic: z.boolean(),
  bioPublic: z.boolean(),
  avatarPublic: z.boolean(),
  linksPublic: z.boolean(),
  skinTypesPublic: z.boolean(),
  fitzpatrickPublic: z.boolean(),
  skinConcernsPublic: z.boolean(),
  aiConsent: z.boolean(),
})

export const updatePrivacySettingsSchema = z
  .object({
    profilePublic: z.boolean().optional(),
    bioPublic: z.boolean().optional(),
    avatarPublic: z.boolean().optional(),
    linksPublic: z.boolean().optional(),
    skinTypesPublic: z.boolean().optional(),
    fitzpatrickPublic: z.boolean().optional(),
    skinConcernsPublic: z.boolean().optional(),
    aiConsent: z.boolean().optional(),
  })
  .strict()

// Projection returned for public profile lookups. Each nullable field is
// null when the corresponding `*_public` flag is false (or master is off).
// `links` uses null (not []) to distinguish "hidden" from "user has none".
const publicProfileViewSchema = z.object({
  username: z.string().max(USERNAME_MAX_LENGTH),
  bio: z.string().max(BIO_MAX_LENGTH).nullable(),
  avatarUrl: safeUrl.nullable(),
  links: profileLinkSchema.array().nullable(),
  skinTypes: z.array(z.enum(SKIN_TYPES)).nullable(),
  fitzpatrickType: z.number().int().min(1).max(6).nullable(),
  skinConcerns: z.array(z.enum(SKIN_CONCERNS)).nullable(),
})

// user-preferences

export const displayScale = ['out_of_5', 'out_of_10', 'out_of_20', 'percentage'] as const
export const displayScaleSchema = z.enum(displayScale)

export const criteriaWeightsSchema = z.object({
  tolerance: z.number().min(0).max(10).default(1),
  efficacy: z.number().min(0).max(10).default(1),
  sensoriality: z.number().min(0).max(10).default(1),
  stability: z.number().min(0).max(10).default(1),
  mixability: z.number().min(0).max(10).default(1),
  valueForMoney: z.number().min(0).max(10).default(1),
})

const userPreferencesSchema = z.object({
  userId: z.uuid(),
  displayScale: displayScaleSchema.default('out_of_20'),
  criteriaWeights: criteriaWeightsSchema.default({
    tolerance: 1,
    efficacy: 1,
    sensoriality: 1,
    stability: 1,
    mixability: 1,
    valueForMoney: 1,
  }),
  updatedAt: z.iso.datetime(),
})

export const updateUserPreferencesSchema = z.object({
  displayScale: displayScaleSchema.optional(),
  criteriaWeights: criteriaWeightsSchema.partial().optional(),
})

// TYPES

// profile inferred types

export type SkinType = (typeof SKIN_TYPES)[number]
export type SkinConcern = (typeof SKIN_CONCERNS)[number]

export type ProfileLink = z.infer<typeof profileLinkSchema>

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>

export type UserDermoProfile = z.infer<typeof userDermoProfileSchema>
export type UserDermoProfileUpdateInput = z.infer<typeof userDermoProfileUpdateSchema>

export type ProfileStats = z.infer<typeof profileStatsSchema>

// privacy inferred types

export type PrivacySettings = z.infer<typeof privacySettingsSchema>
export type UpdatePrivacySettingsInput = z.infer<typeof updatePrivacySettingsSchema>
export type PublicProfileView = z.infer<typeof publicProfileViewSchema>

// user-preferences inferred types

export type DisplayScale = z.infer<typeof displayScaleSchema>
export type CriteriaWeights = z.infer<typeof criteriaWeightsSchema>
export type UserPreferences = z.infer<typeof userPreferencesSchema>
export type UpdateUserPreferencesInput = z.infer<typeof updateUserPreferencesSchema>

// profile entity types

export type ProfilePublic = z.infer<typeof profilePublicSchema>

// ERROR HANDLING

// `username` is unique. A collision must surface as a clean 409, never an
// unhandled 500: a 500-vs-200 split lets an authenticated peer probe username
// existence (including private profiles, hidden from the public lookup).
export type ProfileErrorCode = 'username_taken'

export const profileErrorMapping = {
  username_taken: HTTP_STATUS.CONFLICT,
} as const satisfies Record<ProfileErrorCode, HttpStatus>

// concern → product tag translation

export { resolveAvoidSlugs, USER_CONCERN_TO_PRODUCT_TAGS } from './concern-mapping'

// RGPD export (Article 20 portability)

export {
  type ExportDermoProfile,
  type ExportDiscussionReply,
  type ExportDiscussionThread,
  type ExportPreferences,
  type ExportProfile,
  type ExportPurchase,
  type ExportRowMeta,
  type ExportSubtask,
  type ExportTask,
  type ExportUser,
  type ExportUserIngredientAnalysisScore,
  type ExportUserProduct,
  type ExportUserProductReview,
  type ExportUserProductStatusLog,
  USER_EXPORT_SCHEMA_VERSION,
  type UserExport,
} from './export'
