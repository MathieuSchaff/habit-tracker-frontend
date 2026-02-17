// Types API

// Schemas API
export { ErrorResponseSchema, SuccessResponseSchema } from './schemas/api'

// Schemas Auth

export {
  type AuthFieldErrors,
  type AuthInput,
  authSchema,
  type Email,
  emailSchema,
  type HashedPassword,
  loginSchema,
  passwordSchema,
  type RawPassword,
  signupSchema,
  userPublicSchema,
} from './schemas/auth'
// Schemas Profile
export { type ProfileUpdateInput, profileUpdateSchema } from './schemas/profile'
export {
  type ApiError,
  type ApiResponse,
  type ApiSuccess,
  type CommonErrorCode,
  err,
  errorToStatus,
  HTTP_STATUS,
  type HttpStatus,
  isApiError,
  isApiSuccess,
  ok,
} from './types/api'
// Types Auth
export {
  type AccessTokenPayload,
  type AuthErrorCode,
  type AuthenticatedResult,
  type AuthTokens,
  authErrorMapping,
  type BrowserAuthResult,
  type CreateRefreshTokenArgs,
  type LoginResult,
  type LogoutResult,
  type MobileAuthResult,
  type RefreshResult,
  type RefreshTokenPayload,
  type SignupResult,
  type UserPublic,
} from './types/auth'
// Types Profile
export {
  type MeResponse,
  type ProfileErrorCode,
  type ProfilePublic,
  profileErrorMapping,
} from './types/profile'
