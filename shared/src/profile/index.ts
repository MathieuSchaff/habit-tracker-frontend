import { z } from 'zod'

import type { AuthErrorCode } from '../auth'
import type { ApiResponse, CommonErrorCode, HttpStatus } from '../core'
import { HTTP_STATUS } from '../core'

// SCHEMAS

// profile

/** Longueur maximale du username. */
export const USERNAME_MAX_LENGTH = 32

/** Longueur maximale de la bio. */
export const BIO_MAX_LENGTH = 500

// These values are tag slugs from the `skin_type` category in the tags table.
// They must stay in sync with seed-tags.ts. `tous-types` is excluded — it's a
// product tag ("suitable for all"), not a valid user skin type.
export const SKIN_TYPES = [
  'peau-seche',
  'peau-mixte',
  'peau-grasse',
  'peau-reactive',
  'peau-normale',
  'peau-atopique',
  'peau-rugueuse',
  'peau-sensible',
] as const

// These values are tag slugs from the `concern` category in the tags table.
// They must stay in sync with seed-tags.ts. Excluded: `lumiere-bleue`,
// `pollution`, `photo-protection` — product marketing claims, not user conditions.
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
  'microbiome',
  'photo-vieillissement',
  'teint-terne',
  'repulpant',
  'eczema',
  'grain-peau',
  'keratose-pilaire',
] as const

export const profileLinkSchema = z.object({
  label: z.string().min(1).max(50),
  url: z.url(),
})

/**
 * Représentation publique d'un profil (safe pour le client).
 *
 * @remarks
 * Ne contient jamais de données sensibles.
 * Utilisé dans les réponses API et les schemas OpenAPI.
 *
 */
export const profilePublicSchema = z.object({
  userId: z.uuid(),
  username: z.string().max(USERNAME_MAX_LENGTH).nullable().optional(),
  bio: z.string().max(BIO_MAX_LENGTH).nullable().optional(),
  avatarUrl: z.url().nullable().optional(),
  links: profileLinkSchema.array().optional().default([]),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
})

/**
 * Schema de validation pour la mise à jour d'un profil.
 *
 * @remarks
 * Mode strict — rejette tout champ non déclaré.
 * Tous les champs sont optionnels (delta update).
 *
 * Règles de validation :
 * - **username** : 1–{@link USERNAME_MAX_LENGTH} caractères, optionnel
 * - **bio** : max {@link BIO_MAX_LENGTH} caractères, optionnel
 * - **avatarUrl** : URL valide, optionnel
 * - **links** : max 5 liens, optionnel
 *
 * @example
 * ```ts
 * const input = profileUpdateSchema.parse({ username: 'alice' })
 * // input.username → 'alice'
 * ```
 */
export const profileUpdateSchema = z
  .object({
    username: z.string().min(1).max(USERNAME_MAX_LENGTH).optional(),
    bio: z.string().max(BIO_MAX_LENGTH).optional(),
    avatarUrl: z.url().optional(),
    links: profileLinkSchema.array().max(5).optional(),
  })
  .strict()

export const userDermoProfileSchema = z.object({
  userId: z.uuid(),
  skinTypes: z.array(z.enum(SKIN_TYPES)).max(3).nullable(),
  fitzpatrickType: z.number().int().min(1).max(6).nullable(),
  // no upper bound — user can select any combination of concerns from the list
  skinConcerns: z.array(z.enum(SKIN_CONCERNS)),
  privateNotes: z.string().max(2000).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const userDermoProfileUpdateSchema = z
  .object({
    skinTypes: z.array(z.enum(SKIN_TYPES)).max(3).optional(),
    fitzpatrickType: z.number().int().min(1).max(6).nullable().optional(),
    skinConcerns: z.array(z.enum(SKIN_CONCERNS)).optional(),
    privateNotes: z.string().max(2000).nullable().optional(),
  })
  .strict()

/**
 * Statistiques d'utilisation d'un utilisateur.
 */
export const profileStatsSchema = z.object({
  totalHabits: z.number(),
  totalChecks: z.number(),
  bestStreak: z.number(),
  totalProducts: z.number(),
})

// privacy

export const privacySettingsSchema = z.object({
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

export const userPreferencesSchema = z.object({
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
  updatedAt: z.date(),
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

/** Input typé pour la mise à jour d'un profil, inféré depuis {@link profileUpdateSchema}. */
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>

export type UserDermoProfile = z.infer<typeof userDermoProfileSchema>
export type UserDermoProfileUpdateInput = z.infer<typeof userDermoProfileUpdateSchema>

/** Statistiques d'un profil, inférées depuis {@link profileStatsSchema}. */
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

// error codes

/**
 * Codes d'erreur spécifiques au domaine profil.
 *
 * @remarks
 * Étend {@link CommonErrorCode} avec les erreurs propres
 * à la gestion des profils utilisateur.
 */
export type ProfileErrorCode =
  | CommonErrorCode
  | 'profile_not_found'
  | 'invalid_profile_data'
  | 'profile_update_failed'

// API response types

/**
 * Résultat possible de l'opération GET /api/profile.
 *
 * @remarks
 * Combine les erreurs auth (token invalide, session expirée)
 * et profil (profil introuvable) car la route requiert un JWT valide.
 *
 * @see {@link ApiResponse}
 */
export type MeResponse = ApiResponse<ProfilePublic, AuthErrorCode | ProfileErrorCode>

/**
 * Résultat possible de l'opération PATCH /api/profile.
 *
 * @see {@link ApiResponse}
 */
export type ProfileUpdateResponse = ApiResponse<ProfilePublic, AuthErrorCode | ProfileErrorCode>

/**
 * Résultat possible de l'opération GET /api/profile/stats.
 *
 * @see {@link ApiResponse}
 */
export type ProfileStatsResponse = ApiResponse<ProfileStats, AuthErrorCode | ProfileErrorCode>

// HELPERS

/**
 * Mapping des codes d'erreur profil vers les status HTTP correspondants.
 *
 * @remarks
 * Utilisé avec {@link errorToStatus} pour résoudre le status HTTP
 * à partir d'un code d'erreur profil.
 */
export const profileErrorMapping = {
  profile_not_found: HTTP_STATUS.NOT_FOUND,
  invalid_profile_data: HTTP_STATUS.BAD_REQUEST,
  profile_update_failed: HTTP_STATUS.CONFLICT,
} as const satisfies Partial<Record<ProfileErrorCode, HttpStatus>>
