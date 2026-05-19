import { z } from 'zod'

import { safeUrl } from '../core'

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
  totalHabits: z.number(),
  totalChecks: z.number(),
  bestStreak: z.number(),
  totalProducts: z.number(),
})

// privacy

const privacySettingsSchema = z.object({
  profilePublic: z.boolean(),
  aiConsent: z.boolean(),
})

export const updatePrivacySettingsSchema = z
  .object({
    profilePublic: z.boolean().optional(),
    aiConsent: z.boolean().optional(),
  })
  .strict()

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

// user-preferences inferred types

export type DisplayScale = z.infer<typeof displayScaleSchema>
export type CriteriaWeights = z.infer<typeof criteriaWeightsSchema>
export type UserPreferences = z.infer<typeof userPreferencesSchema>
export type UpdateUserPreferencesInput = z.infer<typeof updateUserPreferencesSchema>

// profile entity types

export type ProfilePublic = z.infer<typeof profilePublicSchema>

// concern → product tag translation

export { resolveAvoidSlugs, USER_CONCERN_TO_PRODUCT_TAGS } from './concern-mapping'
