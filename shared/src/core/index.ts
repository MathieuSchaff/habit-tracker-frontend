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

/* Always narrow with isApiSuccess before accessing data or error. */
export type ApiResponse<T, E extends string = string> = ApiSuccess<T> | ApiError<E>

export type CommonErrorCode = keyof typeof baseErrorMapping

// Common Types

export type FieldChange<T> = {
  old: T | null
  new: T | null
}

// Shared by both products and ingredients tag-filter modules.
export type FilterTier = 'essential' | 'advanced'

// Shared tag item shape used in filter-options responses.
// `count` is optional so endpoints that don't aggregate (e.g. ingredient
// filter-options today) keep a plain shape; products endpoint populates it.
export const tagItemSchema = z.object({
  name: z.string(),
  slug: z.string(),
  count: z.number().int().nonnegative().optional(),
})

export interface TagCategoryMeta {
  label: string
  placeholder: string
  tier: FilterTier
  order: number
  // Optional override: when undefined, the drawer falls back to
  // (tier === 'essential'). Set explicitly to keep some essentials
  // collapsed by default and reduce cognitive load on first open.
  defaultOpen?: boolean
}

// Schemas

export const fieldChangeSchema = <T extends z.ZodTypeAny>(valueSchema: T) =>
  z.object({
    old: valueSchema.nullable(),
    new: valueSchema.nullable(),
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

// Zod v4's z.url() accepts javascript: and data: protocols — this refine
// restricts to http/https to prevent XSS via <a href> or <img src>.
export const safeUrl = z
  .url()
  .max(2000)
  .refine((v) => /^https?:\/\//.test(v), { message: 'URL must use http or https protocol' })
