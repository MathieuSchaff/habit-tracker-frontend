import { z } from 'zod'

import type { ApiResponse, CommonErrorCode } from '../core'
import { HTTP_STATUS, type HttpStatus } from '../core'

// SCHEMAS

export const accessTokenPayloadSchema = z.object({
  sub: z.string(),
  type: z.literal('access'),
  jti: z.string(),
  iat: z.number(),
  exp: z.number(),
})

export const refreshTokenPayloadSchema = z.object({
  sub: z.string(),
  type: z.literal('refresh'),
  jti: z.string(),
  iat: z.number(),
  exp: z.number(),
})

/**
 * Schema de validation d'un email.
 *
 * @remarks
 * Applique `trim()` + `toLowerCase()` avant validation via `z.email()`,
 * puis brand le résultat pour empêcher l'utilisation de strings non validées.
 *
 * @see https://zod.dev/api#pipes
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  // .email("Format d'email invalide")
  .pipe(z.email("Format d'email invalide"))
  .brand<'Email'>()

/**
 * Schema de validation d'un mot de passe.
 *
 * @remarks
 * Règles de complexité :
 * - 8 à 128 caractères
 * - Au moins une minuscule, une majuscule, un chiffre, un caractère spécial
 */
export const passwordSchema = z
  .string()
  .min(8, 'Minimum 8 caractères')
  .max(128, 'Maximum 128 caractères')
  .regex(/[a-z]/, 'Au moins une minuscule')
  .regex(/[A-Z]/, 'Au moins une majuscule')
  .regex(/[0-9]/, 'Au moins un chiffre')
  .regex(/[^a-zA-Z0-9]/, 'Caractère spécial requis')
  .brand<'RawPassword'>()

/**
 * Schema combiné email + password, utilisé pour login et signup.
 *
 * @example
 * ```ts
 * const input = authSchema.parse({ email: 'User@Mail.COM', password: 'S3cure!pwd' })
 * // input.email → 'user@mail.com' (Email branded)
 * ```
 */
export const authSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})

/** Alias sémantique — identique à {@link authSchema}. */
export const loginSchema = authSchema

/** Alias sémantique — identique à {@link authSchema}. */
export const signupSchema = authSchema

export const verifyEmailBodySchema = z.object({
  token: z.string().min(1),
})

/**
 * Représentation publique d'un utilisateur (safe pour le client).
 *
 * @remarks
 * Ne contient jamais le mot de passe ou données sensibles.
 * Utilisé dans les réponses auth et les schemas OpenAPI.
 */
export const userPublicSchema = z.object({
  id: z.string(),
  email: z.email(),
  createdAt: z.union([z.date(), z.string()]),
  emailVerified: z.boolean(),
  role: z.enum(['user', 'admin']),
  isDemo: z.boolean(),
})

/**
 * Résultat d'authentification côté navigateur.
 *
 * @remarks
 * Le `refreshToken` n'est **pas** inclus dans le body — il est transmis
 * uniquement via un cookie httpOnly sécurisé.
 */
export const browserAuthResultSchema = z.object({
  user: userPublicSchema,
  accessToken: z.string(),
})

/**
 * Résultat d'authentification côté mobile.
 *
 * @remarks
 * Le `refreshToken` est inclus dans le body pour stockage
 * dans le Secure Storage natif (Keychain iOS / Keystore Android).
 */
export const mobileAuthResultSchema = z.object({
  user: userPublicSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
})

/**
 * Résultat d'un refresh mobile.
 *
 * @remarks
 * Ne contient pas le `user` — juste les nouveaux tokens
 * après rotation du refresh token.
 */
export const mobileRefreshResultSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
})

/** Résultat du check de session (`GET /api/auth/session`). */
export const sessionResultSchema = z.object({
  authenticated: z.literal(true),
  userId: z.string(),
  role: z.enum(['user', 'admin']),
})

/** Body attendu pour les endpoints mobile qui nécessitent un refresh token
 * (`POST /api/auth/mobile/refresh`, `POST /api/auth/mobile/logout`).
 */
export const refreshTokenBodySchema = z.object({
  refreshToken: z.string().optional(),
})

/** Schema pour le changement de mot de passe. */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
  newPassword: passwordSchema,
})

// TYPES

/** Input typé pour login/signup, inféré depuis {@link authSchema}. */
export type AuthInput = z.infer<typeof authSchema>

/** Input pour changement de mot de passe. */
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

/** Erreurs de validation par champ pour les formulaires auth côté client. */
export type AuthFieldErrors = {
  email?: string[]
  password?: string[]
}

/**
 * Email validé et normalisé (trimmed + lowercase).
 *
 * @remarks
 * Branded type — empêche l'utilisation de strings non validées
 * là où un email est attendu.
 * @see {@link emailSchema} pour la validation runtime.
 */
export type Email = string & z.BRAND<'Email'>

/**
 * Mot de passe brut avant hachage.
 *
 * @remarks
 * Garanti conforme aux règles de complexité par {@link passwordSchema}.
 * Ne doit jamais être stocké tel quel — toujours hasher avant persistance.
 */
export type RawPassword = string & z.BRAND<'RawPassword'>

/**
 * Mot de passe haché (bcrypt/argon2).
 *
 * @remarks
 * Branded manuellement (pas via Zod) car le hachage se fait côté serveur,
 * pas via un schema de validation.
 * Ne doit jamais être exposé côté client.
 */
export type HashedPassword = string & { readonly __brand: 'HashedPassword' }

/**
 * Représentation publique d'un utilisateur.
 *
 * @remarks
 * Ce type est le pendant TS de {@link userPublicSchema} (Zod).
 * Utilisé quand on a besoin du type sans la validation runtime.
 */
export type UserPublic = {
  id: string
  email: string
  createdAt: Date | string
  emailVerified: boolean
  role: 'user' | 'admin'
  isDemo: boolean
}

/** Paire de tokens JWT (access + refresh). */
export type AuthTokens = {
  accessToken: string
  refreshToken: string
}

/**
 * Résultat complet d'une authentification réussie (côté service).
 *
 * @remarks
 * Contient les deux tokens + l'utilisateur.
 * Le service renvoie toujours cette forme — c'est le handler
 * qui décide quoi exposer (body vs cookie) selon la plateforme.
 */
export type AuthenticatedResult = AuthTokens & {
  user: UserPublic
}

/**
 * Résultat d'authentification exposé au navigateur.
 *
 * @remarks
 * Le `refreshToken` est transmis via cookie httpOnly,
 * il n'apparaît donc pas dans le body de la réponse.
 */
export type BrowserAuthResult = {
  user: UserPublic
  accessToken: string
}

/**
 * Résultat d'authentification exposé au mobile.
 *
 * @remarks
 * Le `refreshToken` est inclus dans le body pour stockage
 * dans le Secure Storage natif.
 */
export type MobileAuthResult = AuthenticatedResult

/**
 * Codes d'erreur spécifiques au domaine auth.
 *
 * @remarks
 * Étend {@link CommonErrorCode} avec les erreurs propres
 * à l'authentification et la gestion de session.
 */
export type AuthErrorCode =
  | CommonErrorCode
  | 'invalid_credentials'
  | 'email_exists'
  | 'invalid_token'
  | 'missing_refresh_token'
  | 'session_expired'
  | 'invalid_session'
  | 'email_not_verified'
  | 'token_expired'
  | 'too_many_requests'

/**
 * Résultat possible de l'opération signup.
 * @see {@link ApiResponse}
 */
export type SignupResult = ApiResponse<AuthenticatedResult, 'email_exists' | 'server_error'>

/**
 * Résultat possible de l'opération login.
 * @see {@link ApiResponse}
 */
export type LoginResult = ApiResponse<
  AuthenticatedResult,
  'invalid_credentials' | 'email_not_verified' | 'server_error'
>

/**
 * Résultat possible de l'opération refresh.
 * @see {@link ApiResponse}
 */
export type RefreshResult = ApiResponse<
  AuthenticatedResult,
  | 'invalid_token'
  | 'session_expired'
  | 'missing_refresh_token'
  | 'email_not_verified'
  | 'server_error'
>

export type GoogleCallbackResult = ApiResponse<AuthenticatedResult, 'server_error'>

/**
 * Résultat possible de l'opération logout.
 *
 * @remarks
 * Toujours succès côté client — les erreurs serveur
 * sont loggées mais non propagées.
 */
export type LogoutResult = ApiResponse<null>

/**
 * Résultat possible de l'opération de changement de mot de passe.
 */
export type ChangePasswordResult = ApiResponse<null, 'invalid_credentials' | 'server_error'>

/**
 * Payload du JWT access token.
 *
 * @remarks
 * Durée de vie courte (ex: 15 min). Contient le `sub` (userId)
 * et un `jti` unique pour la révocation.
 */
export interface AccessTokenPayload {
  sub: string
  type: 'access'
  jti: string
  iat: number
  exp: number
}

/**
 * Payload du JWT refresh token.
 *
 * @remarks
 * Durée de vie longue (ex: 7-30 jours). Stocké en base
 * pour permettre la révocation et la rotation.
 */
export interface RefreshTokenPayload {
  sub: string
  type: 'refresh'
  jti: string
  iat: number
  exp: number
}

/** Arguments pour créer un refresh token en base de données. */
export interface CreateRefreshTokenArgs {
  userId: string
  jti: string
  expiresAt: Date
  ip?: string | null
  userAgent?: string | null
}

// HELPERS

/**
 * Mapping des codes d'erreur auth vers les status HTTP correspondants.
 *
 * @remarks
 * Utilisé avec {@link errorToStatus} pour résoudre le status HTTP
 * à partir d'un code d'erreur.
 */
export const authErrorMapping = {
  invalid_credentials: HTTP_STATUS.UNAUTHORIZED,
  email_exists: HTTP_STATUS.CONFLICT,
  invalid_token: HTTP_STATUS.UNAUTHORIZED,
  missing_refresh_token: HTTP_STATUS.BAD_REQUEST,
  session_expired: HTTP_STATUS.UNAUTHORIZED,
  invalid_session: HTTP_STATUS.UNAUTHORIZED,
  email_not_verified: HTTP_STATUS.FORBIDDEN,
  token_expired: HTTP_STATUS.BAD_REQUEST,
  too_many_requests: HTTP_STATUS.RATE_LIMIT_EXCEEDED,
} as const satisfies Partial<Record<AuthErrorCode, HttpStatus>>
