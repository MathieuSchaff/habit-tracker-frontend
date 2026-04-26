import { z } from 'zod'

import type { ApiResponse, CommonErrorCode } from '../core'
import { HTTP_STATUS, type HttpStatus } from '../core'

// SCHEMAS

export const accessTokenPayloadSchema = z.object({
  sub: z.string(),
  role: z.enum(['user', 'admin']),
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

/* Trims + lowercases before validating, then brands to prevent raw strings. */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  // .email("Format d'email invalide")
  .pipe(z.email("Format d'email invalide"))
  .brand<'Email'>()

export const passwordSchema = z
  .string()
  .min(8, 'Minimum 8 caractères')
  .max(128, 'Maximum 128 caractères')
  .regex(/[a-z]/, 'Au moins une minuscule')
  .regex(/[A-Z]/, 'Au moins une majuscule')
  .regex(/[0-9]/, 'Au moins un chiffre')
  .regex(/[^a-zA-Z0-9]/, 'Caractère spécial requis')
  .brand<'RawPassword'>()

export const authSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})

/* UI-side schema: backend only validates authSchema. confirmPassword stays client-only. */
export const signupSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  })

export const verifyEmailBodySchema = z.object({
  token: z.string().min(1),
})

export const refreshTokenBodySchema = z.object({
  refreshToken: z.string().optional(),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
  newPassword: passwordSchema,
})

// TYPES

export type AuthInput = z.infer<typeof authSchema>

export type SignupFormInput = z.infer<typeof signupSchema>

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

/* Branded — you can't pass a raw string where an Email is expected. */
export type Email = string & z.BRAND<'Email'>

/* Must be hashed before storing — never persist raw. */
export type RawPassword = string & z.BRAND<'RawPassword'>

/* Branded manually (not via Zod) because hashing happens server-side, not in a schema. */
export type HashedPassword = string & { readonly __brand: 'HashedPassword' }

export type UserPublic = {
  id: string
  email: string
  createdAt: Date | string
  emailVerified: boolean
  role: 'user' | 'admin'
  isDemo: boolean
}

/* The service always returns this full shape — the handler picks what to expose (body vs cookie). */
export type AuthenticatedResult = {
  accessToken: string
  refreshToken: string
  user: UserPublic
}

export type MobileAuthResult = AuthenticatedResult

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

export type SignupErrorCode = 'email_exists' | 'server_error'

export type LoginErrorCode = 'invalid_credentials' | 'email_not_verified' | 'server_error'

export type SignupResult = ApiResponse<AuthenticatedResult, SignupErrorCode>

export type LoginResult = ApiResponse<AuthenticatedResult, LoginErrorCode>

export type RefreshResult = ApiResponse<
  AuthenticatedResult,
  | 'invalid_token'
  | 'session_expired'
  | 'missing_refresh_token'
  | 'email_not_verified'
  | 'server_error'
>

export type GoogleCallbackResult = ApiResponse<AuthenticatedResult, 'server_error'>

/* Always succeeds client-side — server errors are logged but not surfaced. */
export type LogoutResult = ApiResponse<null>

export type ChangePasswordResult = ApiResponse<null, 'invalid_credentials' | 'server_error'>

/* Short-lived (~15 min). `jti` is unique so we can revoke individual tokens. */
export interface AccessTokenPayload {
  sub: string
  role: 'user' | 'admin'
  type: 'access'
  jti: string
  iat: number
  exp: number
}

/* Long-lived (7–30 days). Stored in DB for revocation and rotation. */
export interface RefreshTokenPayload {
  sub: string
  type: 'refresh'
  jti: string
  iat: number
  exp: number
}

export interface CreateRefreshTokenArgs {
  userId: string
  jti: string
  expiresAt: Date
  ip?: string | null
  userAgent?: string | null
}

// HELPERS

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
