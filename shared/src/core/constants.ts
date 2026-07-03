// Zod-free core surface: HTTP codes, error mappings, response types and
// factories. Kept separate from ./schemas so boot code importing HTTP_STATUS or
// the response helpers doesn't pull zod into the critical path.

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  // Hono's c.json() rejects 204, use c.body(null, 204) instead
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMIT_EXCEEDED: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const

export type HttpStatus = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS]

export type ContentfulHttpStatus = Exclude<HttpStatus, typeof HTTP_STATUS.NO_CONTENT>

/* Each domain (auth, profile…) extends this with its own codes. */
export const baseErrorMapping = {
  invalid_input: HTTP_STATUS.BAD_REQUEST,
  not_found: HTTP_STATUS.NOT_FOUND,
  unauthorized: HTTP_STATUS.UNAUTHORIZED,
  forbidden: HTTP_STATUS.FORBIDDEN,
  server_error: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  rate_limit_exceeded: 429,
} as const satisfies Record<string, HttpStatus>

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
  // Optional override: when undefined, the drawer falls back to
  // (tier === 'essential'). Set explicitly to keep some essentials
  // collapsed by default and reduce cognitive load on first open.
  defaultOpen?: boolean
}

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

export const isApiSuccess = <T, E extends string>(
  response: ApiResponse<T, E>
): response is ApiSuccess<T> => {
  return response.success === true
}
