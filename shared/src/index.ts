// Types API
export {
  type ApiSuccess,
  type ApiError,
  type ApiResponse,
  type HttpStatus,
  type CommonErrorCode,
  ok,
  err,
  errorToStatus,
  isApiSuccess,
  isApiError,
  HTTP_STATUS,
} from "./types/api";

// Types Auth
export {
  type UserPublic,
  type LoginErrorCode,
  type SignupErrorCode,
  type AuthErrorCode,
  type LoginResponse,
  type SignupResponse,
  type LogoutResponse,
  type PingResponse,
  type ValidationErrorCode,
  type LoginServiceResult,
  type SignupServiceResult,
  type LogoutServiceResult,
  authErrorMapping,
} from "./types/auth";

// Types Profile
export {
  type ProfilePublic,
  type ProfileErrorCode,
  type MeResponse,
  profileErrorMapping,
} from "./types/profile";

// Schemas API
export { SuccessResponseSchema, ErrorResponseSchema } from "./schemas/api";

// Schemas Auth
export { authSchema, type AuthInput, UserPublicSchema, ZodFieldErrors } from "./schemas/auth";

// Schemas Profile
export { profileUpdateSchema, type ProfileUpdateInput } from "./schemas/profile";
