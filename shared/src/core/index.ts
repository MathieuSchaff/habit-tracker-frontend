import { z } from 'zod'

// HTTP Status Codes

/** Codes HTTP utilisés dans l'API. Utiliser ces constantes plutôt que des nombres littéraux. */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  // NE PAS UTILISER 204 avec c.json() car Hono ne l'accepte pas (ContentfulStatusCode).
  // Utiliser c.body(null, HTTP_STATUS.NO_CONTENT) à la place.
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMIT_EXCEEDED: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const

export type HttpStatus = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS]

/** Status HTTP acceptables par c.json() dans Hono */
export type ContentfulHttpStatus = Exclude<HttpStatus, typeof HTTP_STATUS.NO_CONTENT>

// Error Mapping

/**
 * Codes d'erreur communs à tous les endpoints.
 * Chaque domaine (auth, habits...) étend ce type avec ses propres codes.
 * @see {@link AuthErrorCode}
 * @see {@link HabitErrorCode}
 * @see {@link ProfileErrorCode}
 */
export const baseErrorMapping = {
  invalid_input: HTTP_STATUS.BAD_REQUEST,
  not_found: HTTP_STATUS.NOT_FOUND,
  unauthorized: HTTP_STATUS.UNAUTHORIZED,
  forbidden: HTTP_STATUS.FORBIDDEN,
  server_error: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  rate_limit_exceeded: 429,
} as const satisfies Record<string, HttpStatus>

// API Response Types

/**
 * Réponse success générique de l'API.
 *
 * @template T - Type des données retournées
 * @example
 * const response: ApiSuccess<UserPublic> = {
 *   success: true,
 *   data: { id: 'uuid', email: 'user@example.com' }
 * }
 */
export type ApiSuccess<T> = {
  success: true
  data: T
  message?: string
}

/**
 * Réponse erreur générique de l'API.
 *
 * @template E - Union des codes d'erreur possibles pour cet endpoint.
 * Utiliser un union type précis plutôt que `string` pour bénéficier
 * de l'exhaustivité TypeScript.
 * @example
 * const response: ApiError<'invalid_credentials' | 'server_error'> = {
 *   success: false,
 *   error: 'invalid_credentials'
 * }
 */
export type ApiError<E extends string = string> = {
  success: false
  error: E
  details?: unknown
}

/**
 * Union type représentant toute réponse possible d'un endpoint.
 *
 * @remarks
 * Ne pas accéder à `data` ou `error` directement sans narrowing —
 * toujours utiliser les type guards `isApiSuccess` / `isApiError`
 * ou une vérification sur `response.success`.
 *
 * @template T - Type des données en cas de succès
 * @template E - Union des codes d'erreur possibles
 */
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

/**
 * Schema Zod générique pour une réponse API success.
 *
 * @remarks
 * Utilisé dans les définitions `createRoute` de `@hono/zod-openapi`
 * pour générer la documentation OpenAPI/Swagger.
 *
 * @param dataSchema - Schema Zod décrivant le contenu de `data`
 * @returns Schema `{ success: true, data: T, message?: string }`
 *
 * @example
 * ```ts
 * const schema = SuccessResponseSchema(userPublicSchema)
 * ```
 */
export const SuccessResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    message: z.string().optional(),
  })

/**
 * Schema Zod générique pour une réponse API erreur.
 *
 * @remarks
 * Utilisé dans les définitions `createRoute` pour documenter
 * les réponses d'erreur dans OpenAPI/Swagger.
 */
export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.unknown().optional(),
})

// Response Factories

/**
 * Crée une réponse success typée.
 *
 * @remarks
 * Toujours utiliser ce helper plutôt que de construire l'objet manuellement
 * pour garantir la cohérence du format de réponse.
 * @example
 * return c.json(ok(user), HTTP_STATUS.CREATED)
 * return c.json(ok(null, 'Disconnected'), HTTP_STATUS.OK)
 */
export const ok = <T>(data: T, message?: string): ApiSuccess<T> => ({
  success: true,
  data,
  message,
})

/**
 * Crée une réponse erreur typée.
 *
 * @remarks
 * Toujours utiliser ce helper plutôt que de construire l'objet manuellement
 * pour garantir la cohérence du format de réponse.
 * @example
 * return c.json(err('invalid_credentials'), HTTP_STATUS.UNAUTHORIZED)
 * return c.json(err('invalid_input', zodError.flatten()), HTTP_STATUS.BAD_REQUEST)
 */
export const err = <E extends string>(error: E, details?: unknown): ApiError<E> => ({
  success: false,
  error,
  details,
})

/**
 * Convertit un code d'erreur en status HTTP.
 *
 * @remarks
 * Fusionne le mapping de base avec un mapping spécifique au domaine.
 * Si le code est absent des deux mappings, retourne 500 par défaut.
 * @example
 * // Dans un handler Hono :
 * const status = errorToStatus(error, authErrorMapping)
 * return c.json(err(error), status)
 */
export const errorToStatus = <E extends string>(
  error: E,
  customMapping: Record<Exclude<E, CommonErrorCode>, HttpStatus>
): ContentfulHttpStatus => {
  const mapping = { ...baseErrorMapping, ...customMapping }
  const status = mapping[error as keyof typeof mapping] ?? HTTP_STATUS.INTERNAL_SERVER_ERROR
  return status as ContentfulHttpStatus
}

// Type Guards

/**
 * Type guard — narrowe `ApiResponse<T, E>` vers `ApiSuccess<T>`.
 * @example
 * if (isApiSuccess(response)) {
 *   console.log(response.data) // T
 * }
 */
export const isApiSuccess = <T, E extends string>(
  response: ApiResponse<T, E>
): response is ApiSuccess<T> => {
  return response.success === true
}

/**
 * Type guard — narrowe `ApiResponse<T, E>` vers `ApiError<E>`.
 * @example
 * if (isApiError(response)) {
 *   console.log(response.error) // E
 * }
 */
export const isApiError = <T, E extends string>(
  response: ApiResponse<T, E>
): response is ApiError<E> => {
  return response.success === false
}

// OpenAPI Response Helpers

/**
 * Génère une définition de réponse success pour `createRoute`.
 *
 * @param schema - Schema Zod du champ `data`
 * @param description - Description affichée dans Swagger UI
 *
 * @example
 * ```ts
 * const route = createRoute({
 *   responses: {
 *     200: successResponse(userPublicSchema, 'User retrieved'),
 *     401: errorResponse('Not authenticated'),
 *   },
 * })
 * ```
 */
export function successResponse<T extends z.ZodType>(schema: T, description: string) {
  return {
    content: { 'application/json': { schema: SuccessResponseSchema(schema) } },
    description,
  }
}

/**
 * Génère une définition de réponse erreur pour `createRoute`.
 *
 * @param description - Description affichée dans Swagger UI
 */
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
