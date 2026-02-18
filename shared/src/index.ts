// Types API

// Schemas API
export { ErrorResponseSchema, SuccessResponseSchema } from './schemas/api'

// Schemas Auth

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
// Schemas Habits (types)
export type {
  CheckHabitInput,
  CreateHabitInput,
  Frequency,
  GetHabitChecksQuery,
  GetHabitStatsQuery,
  GetUserChecksQuery,
  Period,
  Reminder,
  SetPeriodInput,
  SetRemindersInput,
  SetTimingsInput,
  Timing,
  ToggleCheckInput,
  UpdateFrequencyInput,
  UpdateHabitInput,
} from './schemas/habits'
// Schemas Habits (values)
export {
  checkHabitSchema,
  createHabitSchema,
  frequencySchema,
  getHabitChecksQuerySchema,
  getHabitStatsQuerySchema,
  getUserChecksQuerySchema,
  periodSchema,
  REMINDER_PRESETS,
  reminderSchema,
  setPeriodSchema,
  setRemindersSchema,
  setTimingsSchema,
  timingSchema,
  toggleCheckSchema,
  uncheckByDateSchema,
  uncheckHabitSchema,
  updateFrequencySchema,
  updateHabitSchema,
} from './schemas/habits'
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
// Types Habits (types)
export type {
  HabitErrorCode,
  HabitStats,
  HabitWithRelations,
  TodayHabit,
} from './types/habits'
// Types Habits (values)
export { habitErrorToStatus } from './types/habits'
// Types Profile
export {
  type MeResponse,
  type ProfileErrorCode,
  type ProfilePublic,
  profileErrorMapping,
} from './types/profile'
