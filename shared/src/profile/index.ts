import { z } from 'zod'

import { safeUrl } from '../core'
import { BIO_MAX_LENGTH, SKIN_CONCERNS, SKIN_TYPES, USERNAME_MAX_LENGTH } from './constants'

export * from './constants'

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

/* Strict mode: rejects unknown fields. All fields optional (delta update). */
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
  // no upper bound, user can select any combination of concerns from the list
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

// Master `profilePublic` gates all field-level flags: when false, no field is
// exposed regardless of its sub-flag. Username is implicit (URL identifier).
// `discoverable` is consent to MATCHING (the similarity engine may rank this
// profile against others), distinct from the `*Public` display flags and from
// `skinConcernsPublic`: one can be found by a shared bucket without exposing
// raw concerns. Opt-in, defaults off, only effective under master profilePublic.
const privacySettingsSchema = z.object({
  profilePublic: z.boolean(),
  bioPublic: z.boolean(),
  avatarPublic: z.boolean(),
  linksPublic: z.boolean(),
  skinTypesPublic: z.boolean(),
  fitzpatrickPublic: z.boolean(),
  skinConcernsPublic: z.boolean(),
  discoverable: z.boolean(),
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
    discoverable: z.boolean().optional(),
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
  criteriaWeights: criteriaWeightsSchema.partial().optional(),
})

export type ProfileLink = z.infer<typeof profileLinkSchema>

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>

export type UserDermoProfile = z.infer<typeof userDermoProfileSchema>
export type UserDermoProfileUpdateInput = z.infer<typeof userDermoProfileUpdateSchema>

export type ProfileStats = z.infer<typeof profileStatsSchema>

export type PrivacySettings = z.infer<typeof privacySettingsSchema>
export type UpdatePrivacySettingsInput = z.infer<typeof updatePrivacySettingsSchema>
export type PublicProfileView = z.infer<typeof publicProfileViewSchema>

export type CriteriaWeights = z.infer<typeof criteriaWeightsSchema>
export type UserPreferences = z.infer<typeof userPreferencesSchema>
export type UpdateUserPreferencesInput = z.infer<typeof updateUserPreferencesSchema>

export type ProfilePublic = z.infer<typeof profilePublicSchema>
