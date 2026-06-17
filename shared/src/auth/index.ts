import { z } from 'zod'

import type { ApiResponse, CommonErrorCode } from '../core'
import { HTTP_STATUS, type HttpStatus } from '../core'

// SCHEMAS

export const accessTokenPayloadSchema = z.object({
  sub: z.string(),
  role: z.enum(['user', 'admin', 'contributor']),
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

// token is always 64 hex chars (generateRawToken); reject malformed input before the service.
export const verifyEmailBodySchema = z.object({
  token: z.string().length(64),
})

export const refreshTokenBodySchema = z.object({
  refreshToken: z.string().optional(),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
  newPassword: passwordSchema,
})

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export const resetPasswordSchema = z.object({
  token: z.string().length(64),
  password: passwordSchema,
})

/* UI-side schema: backend only validates resetPasswordSchema (token + password).
   confirmPassword stays client-only. */
export const resetPasswordFormSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  })

// TYPES

export type AuthInput = z.infer<typeof authSchema>

export type SignupFormInput = z.infer<typeof signupSchema>

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

export type ResetPasswordFormInput = z.infer<typeof resetPasswordFormSchema>

/* Branded: you can't pass a raw string where an Email is expected. */
export type Email = string & z.BRAND<'Email'>

/* Must be hashed before storing; never persist raw. */
export type RawPassword = string & z.BRAND<'RawPassword'>

/* Branded manually (not via Zod) because hashing happens server-side, not in a schema. */
export type HashedPassword = string & { readonly __brand: 'HashedPassword' }

export type UserPublic = {
  id: string
  email: string
  createdAt: string
  emailVerified: boolean
  role: 'user' | 'admin' | 'contributor'
  isDemo: boolean
}

/* The service always returns this full shape; the handler picks what to expose (body vs cookie). */
export type AuthenticatedResult = {
  accessToken: string
  refreshToken: string
  user: UserPublic
}

export type MobileAuthResult = AuthenticatedResult

export type AuthErrorCode =
  | CommonErrorCode
  | 'invalid_credentials'
  | 'invalid_token'
  | 'missing_refresh_token'
  | 'session_expired'
  | 'invalid_session'
  | 'email_not_verified'
  | 'token_expired'
  | 'too_many_requests'

export type SignupErrorCode = 'server_error'

export type LoginErrorCode = 'invalid_credentials' | 'email_not_verified' | 'server_error'

/* Enumeration-safe: signup returns this identical neutral shape whether the email
   is new or already registered, with no session. Truth is delivered only by email.
   See ADR 0009. */
export type SignupPending = { pending: true }

export type SignupResult = ApiResponse<SignupPending, SignupErrorCode>

/* Enumeration-safe: forgot-password returns this identical neutral shape whether
   the email exists or not, with no session. A reset link reaches only the address
   owner, by email. See ADR 0010. */
export type PasswordResetPending = { pending: true }

export type ForgotPasswordResult = ApiResponse<PasswordResetPending, 'server_error'>

/* Distinct invalid-vs-expired is tolerated here: it's a token-holder-only path on a
   2^256 space, so it leaks nothing about other accounts. The always-neutral rule
   applies to the forgot-password *request*, not the reset confirmation. */
export type ResetPasswordErrorCode = 'invalid_token' | 'token_expired' | 'server_error'

export type ResetPasswordResult = ApiResponse<null, ResetPasswordErrorCode>

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

/* Always succeeds client-side; server errors are logged but not surfaced. */
export type LogoutResult = ApiResponse<null>

export type ChangePasswordResult = ApiResponse<null, 'invalid_credentials' | 'server_error'>

/* Short-lived (~15 min). `jti` is unique so we can revoke individual tokens. */
export interface AccessTokenPayload {
  sub: string
  role: 'user' | 'admin' | 'contributor'
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
  expiresAt: string
  ip?: string | null
  userAgent?: string | null
}

// HELPERS

export const authErrorMapping = {
  invalid_credentials: HTTP_STATUS.UNAUTHORIZED,
  invalid_token: HTTP_STATUS.UNAUTHORIZED,
  missing_refresh_token: HTTP_STATUS.BAD_REQUEST,
  session_expired: HTTP_STATUS.UNAUTHORIZED,
  invalid_session: HTTP_STATUS.UNAUTHORIZED,
  email_not_verified: HTTP_STATUS.FORBIDDEN,
  token_expired: HTTP_STATUS.BAD_REQUEST,
  too_many_requests: HTTP_STATUS.RATE_LIMIT_EXCEEDED,
} as const satisfies Partial<Record<AuthErrorCode, HttpStatus>>

/* Reset-password maps invalid_token to 400 (mirror /verify-email), NOT auth's 401:
   the codes overlap but the status differs, so it needs its own mapping. server_error
   falls back to 500 via baseErrorMapping. */
export const resetPasswordErrorMapping = {
  invalid_token: HTTP_STATUS.BAD_REQUEST,
  token_expired: HTTP_STATUS.BAD_REQUEST,
} as const satisfies Partial<Record<ResetPasswordErrorCode, HttpStatus>>

/* Non-sensitive boot hint cookie. Presence ⇒ a refresh session may exist (never a token);
   lets the SPA skip the /auth/refresh probe for anonymous visitors. */
export const SESSION_HINT_COOKIE = 'aurore_session'
