// Schemas (runtime validators + inferred types)

export { ErrorResponseSchema, SuccessResponseSchema } from './schemas/api'
export {
  type AuthFieldErrors,
  type AuthInput,
  accessTokenPayloadSchema,
  authSchema,
  browserAuthResultSchema,
  type ChangePasswordInput,
  changePasswordSchema,
  type Email,
  emailSchema,
  type HashedPassword,
  loginSchema,
  mobileAuthResultSchema,
  mobileRefreshResultSchema,
  passwordSchema,
  type RawPassword,
  refreshTokenBodySchema,
  refreshTokenPayloadSchema,
  sessionResultSchema,
  signupSchema,
  userPublicSchema,
  verifyEmailBodySchema,
} from './schemas/auth'
export {
  type CreateReplyInput,
  type CreateThreadInput,
  createReplySchema,
  createThreadSchema,
  replyResponseSchema,
  threadResponseSchema,
  threadWithRepliesResponseSchema,
} from './schemas/discussions'
export {
  type CheckHabitInput,
  type CreateHabitInput,
  checkHabitSchema,
  checkProductHistoryResponseSchema,
  createHabitSchema,
  type DateRangeQuery,
  dateRangeQuerySchema,
  type Frequency,
  frequencySchema,
  type GetUserChecksQuery,
  getUserChecksQuerySchema,
  type HabitProductInput,
  habitCheckResponseSchema,
  habitFrequencyResponseSchema,
  habitPeriodResponseSchema,
  habitProductResponseSchema,
  habitProductSchema,
  habitReminderResponseSchema,
  habitResponseSchema,
  habitStatsResponseSchema,
  habitTimingResponseSchema,
  habitWithRelationsResponseSchema,
  type Period,
  periodSchema,
  REMINDER_PRESETS,
  type Reminder,
  type ReorderHabitsInput,
  reminderSchema,
  reminderWithTimingSchema,
  reorderHabitsSchema,
  type SetPeriodInput,
  type SetProductsInput,
  type SetRemindersInput,
  type SetRemindersWithTimingInput,
  type SetTimingsInput,
  setPeriodSchema,
  setProductsSchema,
  setRemindersSchema,
  setTimingsSchema,
  type Timing,
  type ToggleCheckInput,
  timingSchema,
  todayHabitResponseSchema,
  todayUserProductSchema,
  toggleCheckResultResponseSchema,
  toggleCheckSchema,
  type UpdateFrequencyInput,
  type UpdateHabitInput,
  uncheckByDateSchema,
  uncheckHabitSchema,
  updateFrequencySchema,
  updateHabitSchema,
} from './schemas/habits'
export {
  INGREDIENT_CATEGORIES,
  INGREDIENT_CATEGORY_VALUES,
  type IngredientCategory,
} from './schemas/ingredient-categories'
export {
  type CreateIngredientInput,
  createIngredientSchema,
  type IngredientChanges,
  type IngredientEditResponse,
  type IngredientResponse,
  type IngredientSearchFilters,
  type IngredientSearchResult,
  ingredientChangesSchema,
  ingredientEditResponseSchema,
  ingredientResponseSchema,
  ingredientSearchResultSchema,
  ingredientsSearchSchema,
  type UpdateIngredientInput,
  type UpdateIngredientRouteInput,
  updateIngredientRouteSchema,
  updateIngredientSchema,
} from './schemas/ingredients'
export {
  type HabitCheckProductResponse,
  type HabitCheckWithProductsResponse,
  habitCheckProductInputSchema,
  habitCheckProductResponseSchema,
  habitCheckWithProductsResponseSchema,
  type LogHabitCheckInput,
  type LogWellbeingInput,
  logHabitCheckSchema,
  logWellbeingSchema,
  type TodayLogsResponse,
  todayLogsQuerySchema,
  todayLogsResponseSchema,
  type WellbeingLogResponse,
  wellbeingLogResponseSchema,
  wellbeingMetricSchema,
  wellbeingMetrics,
} from './schemas/logs'
export {
  type PrivacySettings,
  privacySettingsSchema,
  type UpdatePrivacySettingsInput,
  updatePrivacySettingsSchema,
} from './schemas/privacy'
export {
  type CreateProductIngredientInput,
  createProductIngredientSchema,
  productIngredientResponseSchema,
} from './schemas/product-ingredients'
export {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_VALUES,
  PRODUCT_KINDS,
  type ProductCategory,
  type ProductKind,
  type ProductKindsMap,
} from './schemas/product-kinds'
export { PRODUCT_UNITS, type ProductUnit } from './schemas/product-units'
export {
  type CreateProductInput,
  createProductSchema,
  filterOptionsSchema,
  type ListProductsFilters,
  listProductsQuery,
  type ProductChanges,
  type ProductEditResponseSchema,
  type ProductsPage,
  productChangesSchema,
  productEditResponseSchema,
  productResponseSchema,
  productsPageSchema,
  searchProductsQuery,
  type UpdateProductInput,
  updateProductSchema,
} from './schemas/products'
export {
  BIO_MAX_LENGTH,
  type ProfileLink,
  type ProfileStats,
  type ProfileUpdateInput,
  profileLinkSchema,
  profilePublicSchema,
  profileStatsSchema,
  profileUpdateSchema,
  SKIN_CONCERNS,
  SKIN_TYPES,
  type SkinConcern,
  type SkinType,
  USERNAME_MAX_LENGTH,
  type UserDermoProfile,
  type UserDermoProfileUpdateInput,
  userDermoProfileSchema,
  userDermoProfileUpdateSchema,
} from './schemas/profile'
export {
  type AddPurchaseInput,
  addPurchaseSchema,
  type FinishPurchaseInput,
  finishPurchaseSchema,
  type OpenPurchaseInput,
  openPurchaseSchema,
  type Purchase,
  purchaseSchema,
  type UpdatePurchaseInput,
  updatePurchaseSchema,
} from './schemas/purchases'
export {
  type FilterTier,
  filterCategoriesFor,
  TAG_CATEGORY_META,
  type TagCategoryMeta,
} from './schemas/tag-filters'
export { TAG_SLUGS, type TagSlug } from './schemas/tag-slugs'
export {
  canTagEntity,
  getTagCategory,
  isValidAvoidTag,
  TAG_CATEGORIES,
  TAG_TAXONOMY,
  type TagCategory,
  type TagMeta,
  type TagScope,
} from './schemas/tag-taxonomy'
export {
  type AddIngredientTagInput,
  type AddProductTagInput,
  addIngredientTagSchema,
  addProductTagSchema,
  type CreateTagInput,
  createTagSchema,
  type IngredientTagResponse,
  ingredientTagResponseSchema,
  type Relevance,
  type ReplaceIngredientTagsInput,
  type ReplaceProductTagsInput,
  relevanceEnum,
  replaceIngredientTagsSchema,
  replaceProductTagsSchema,
  tagResponseSchema,
  type UpdateTagInput,
} from './schemas/tags'
export {
  type CreateSubtaskInput,
  type CreateTaskInput,
  createSubtaskSchema,
  createTaskSchema,
  type UpdateSubtaskInput,
  type UpdateTaskInput,
  updateSubtaskSchema,
  updateTaskSchema,
} from './schemas/tasks'
export {
  type CriteriaWeights,
  criteriaWeightsSchema,
  type DisplayScale,
  displayScale,
  displayScaleSchema,
  type UpdateUserPreferencesInput,
  type UserPreferences,
  updateUserPreferencesSchema,
  userPreferencesSchema,
} from './schemas/user-preferences'
export {
  type CreateUserProductInput,
  createUserProductSchema,
  type RepurchaseFlag,
  repurchaseFlag,
  repurchaseFlagSchema,
  type UpdateUserProductInput,
  type UpdateUserProductReviewInput,
  type UserProduct,
  type UserProductReview,
  type UserProductStatus,
  updateUserProductReviewSchema,
  updateUserProductSchema,
  userProductReviewSchema,
  userProductSchema,
  userProductStatus,
  userProductStatusSchema,
} from './schemas/user-products'

// Types (entity types, error codes, composed types)

// Types (entity types, error codes, composed types)

export type {
  ApiError,
  ApiResponse,
  ApiSuccess,
  CommonErrorCode,
} from './types/api'
export type {
  AccessTokenPayload,
  AuthErrorCode,
  AuthenticatedResult,
  AuthTokens,
  BrowserAuthResult,
  ChangePasswordResult,
  CreateRefreshTokenArgs,
  GoogleCallbackResult,
  LoginResult,
  LogoutResult,
  MobileAuthResult,
  RefreshResult,
  RefreshTokenPayload,
  SignupResult,
  UserPublic,
} from './types/auth'
export type { FieldChange } from './types/common'
export type {
  DiscussionErrorCode,
  DiscussionReply,
  DiscussionThread,
  DiscussionThreadWithReplies,
} from './types/discussions'
export type {
  Habit,
  HabitCheck,
  HabitCheckProduct,
  HabitCheckStatus,
  HabitErrorCode,
  HabitFrequency,
  HabitPeriod,
  HabitProduct,
  HabitReminder,
  HabitStats,
  HabitTiming,
  HabitTimingWithReminders,
  HabitWithRelations,
  TodayHabit,
  TodayUserProduct,
  ToggleCheckResult,
} from './types/habits'
export type {
  EditableIngredientKeys,
  Ingredient,
  IngredientEdit,
  IngredientErrorCode,
} from './types/ingredients'
export type { LogsErrorCode } from './types/logs'
export type {
  ProductIngredient,
  ProductIngredientErrorCode,
} from './types/product-ingredients'
export type {
  EditableProductKeys,
  Product,
  ProductEdit,
  ProductErrorCode,
  ProductSearchResult,
  ProductWithStock,
} from './types/products'
export type {
  MeResponse,
  ProfileErrorCode,
  ProfilePublic,
  ProfileStatsResponse,
  ProfileUpdateResponse,
} from './types/profile'
export type { PurchaseErrorCode } from './types/purchases'
export type {
  IngredientTag,
  ProductTag,
  Tag,
  TagErrorCode,
} from './types/tags'
export type {
  Subtask,
  Task,
  TaskEnergy,
  TaskErrorCode,
  TaskStatus,
} from './types/tasks'
export type { UserProductErrorCode } from './types/user-products'

// Helpers (error mappings, constants, utilities)

// Helpers (error mappings, constants, utilities)

export {
  err,
  errorToStatus,
  isApiError,
  isApiSuccess,
  ok,
} from './helpers/api'
export { authErrorMapping } from './helpers/auth'
export {
  baseErrorMapping,
  type ContentfulHttpStatus,
  HTTP_STATUS,
  type HttpStatus,
} from './helpers/constants'
export { discussionErrorMapping } from './helpers/discussions'
export { habitErrorMapping } from './helpers/habits'
export { ingredientErrorMapping } from './helpers/ingredients'
export { logsErrorMapping } from './helpers/logs'
export { productIngredientErrorMapping } from './helpers/product-ingredients'
export { productErrorMapping } from './helpers/products'
export { profileErrorMapping } from './helpers/profile'
export { purchaseErrorMapping } from './helpers/purchases'
export { tagErrorMapping } from './helpers/tags'
export { taskErrorMapping } from './helpers/tasks'
export { userProductErrorMapping } from './helpers/user-products'

// OpenAPI

export {
  errorResponse,
  errorResponseWithOptionnalErrorCode,
  successResponse,
} from './openapi/responses'
