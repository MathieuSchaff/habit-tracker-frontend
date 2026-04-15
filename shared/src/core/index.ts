import { z } from 'zod'

// HTTP Status Codes

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  // Hono's c.json() rejects 204 — use c.body(null, 204) instead
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMIT_EXCEEDED: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const

export type HttpStatus = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS]

// c.json() in Hono rejects 204 — use c.body(null, 204) instead
export type ContentfulHttpStatus = Exclude<HttpStatus, typeof HTTP_STATUS.NO_CONTENT>

// Error Mapping

/* Each domain (auth, habits…) extends this with its own codes. */
export const baseErrorMapping = {
  invalid_input: HTTP_STATUS.BAD_REQUEST,
  not_found: HTTP_STATUS.NOT_FOUND,
  unauthorized: HTTP_STATUS.UNAUTHORIZED,
  forbidden: HTTP_STATUS.FORBIDDEN,
  server_error: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  rate_limit_exceeded: 429,
} as const satisfies Record<string, HttpStatus>

// API Response Types

export type ApiSuccess<T> = {
  success: true
  data: T
  message?: string
}

export type ApiError<E extends string = string> = {
  success: false
  error: E
  details?: unknown
}

/* Always narrow with isApiSuccess/isApiError before accessing data or error. */
export type ApiResponse<T, E extends string = string> = ApiSuccess<T> | ApiError<E>

export type CommonErrorCode = keyof typeof baseErrorMapping

// Common Types

export type FieldChange<T> = {
  old: T | null
  new: T | null
}

// Shared by both products and ingredients tag-filter modules.
export type FilterTier = 'essential' | 'advanced'

export interface TagCategoryMeta {
  label: string
  placeholder: string
  tier: FilterTier
  order: number
}

// Schemas

export const fieldChangeSchema = <T extends z.ZodTypeAny>(valueSchema: T) =>
  z.object({
    old: valueSchema.nullable(),
    new: valueSchema.nullable(),
  })

/* Used in createRoute definitions to generate OpenAPI docs. */
export const SuccessResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    message: z.string().optional(),
  })

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.unknown().optional(),
})

// Response Factories

export const ok = <T>(data: T, message?: string): ApiSuccess<T> => ({
  success: true,
  data,
  message,
})

export const err = <E extends string>(error: E, details?: unknown): ApiError<E> => ({
  success: false,
  error,
  details,
})

/* Merges base + domain mappings. Falls back to 500 if the code is unknown. */
export const errorToStatus = <E extends string>(
  error: E,
  customMapping: Record<Exclude<E, CommonErrorCode>, HttpStatus>
): ContentfulHttpStatus => {
  const mapping = { ...baseErrorMapping, ...customMapping }
  const status = mapping[error as keyof typeof mapping] ?? HTTP_STATUS.INTERNAL_SERVER_ERROR
  return status as ContentfulHttpStatus
}

// Type Guards

export const isApiSuccess = <T, E extends string>(
  response: ApiResponse<T, E>
): response is ApiSuccess<T> => {
  return response.success === true
}

export const isApiError = <T, E extends string>(
  response: ApiResponse<T, E>
): response is ApiError<E> => {
  return response.success === false
}

// OpenAPI Response Helpers

export function successResponse<T extends z.ZodType>(schema: T, description: string) {
  return {
    content: { 'application/json': { schema: SuccessResponseSchema(schema) } },
    description,
  }
}

export function errorResponse(description: string) {
  return {
    content: { 'application/json': { schema: ErrorResponseSchema } },
    description,
  }
}

export function errorResponseWithOptionnalErrorCode(
  description: string,
  errorCodes?: readonly string[]
) {
  const schema = errorCodes
    ? ErrorResponseSchema.extend({ error: z.enum(errorCodes as [string, ...string[]]) })
    : ErrorResponseSchema

  return {
    content: { 'application/json': { schema } },
    description,
  }
}
