import {
  authErrorMapping,
  type ContentfulHttpStatus,
  discussionErrorMapping,
  err,
  errorToStatus,
  HTTP_STATUS,
  type HttpStatus,
  habitErrorMapping,
  ingredientErrorMapping,
  logsErrorMapping,
  productErrorMapping,
  productIngredientErrorMapping,
  purchaseErrorMapping,
  tagErrorMapping,
  taskErrorMapping,
  userProductErrorMapping,
} from '@habit-tracker/shared'

import type { Context } from 'hono'

import { logger } from '../../lib/logger'

// I create these interfaces because Typescript gets angry if we just check error.code without telling it what error is.
// It replaces the old 'any' cast we had before to be safer.
interface AppError extends Error {
  code: string
  details?: unknown
}

interface HttpError extends Error {
  status: number
}

/**
 * This catches every error that happens in the Hono app.
 * We use it so we do not have to put try/catch everywhere in our routes.
 * It reads the custom error we throw and replies with the correct status code and JSON format.
 */
export async function globalErrorHandler(error: Error, c: Context) {
  // If the error has a 'code', we know it is one of our custom domain errors like ProductError.
  // We have to cast it to AppError here so we can read the code without Typescript errors.
  if ('code' in error && typeof (error as AppError).code === 'string') {
    const appError = error as AppError
    const errorName = appError.constructor.name
    let mapping: Record<string, HttpStatus> = {}

    // We look at the name of the class (like 'HabitError') to pick the right mapping object.
    // This mapping tells us which HTTP status to send back for each specific code.
    switch (errorName) {
      case 'HabitError':
        mapping = habitErrorMapping as Record<string, HttpStatus>
        break
      case 'AuthError':
        mapping = authErrorMapping as Record<string, HttpStatus>
        break
      case 'ProductError':
        mapping = productErrorMapping as Record<string, HttpStatus>
        break
      case 'IngredientError':
        mapping = ingredientErrorMapping as Record<string, HttpStatus>
        break
      case 'LogsError':
        mapping = logsErrorMapping as Record<string, HttpStatus>
        break
      case 'ProductIngredientError':
        mapping = productIngredientErrorMapping as Record<string, HttpStatus>
        break
      case 'PurchaseError':
        mapping = purchaseErrorMapping as Record<string, HttpStatus>
        break
      case 'TagError':
        mapping = tagErrorMapping as Record<string, HttpStatus>
        break
      case 'TaskError':
        mapping = taskErrorMapping as Record<string, HttpStatus>
        break
      case 'UserProductError':
        mapping = userProductErrorMapping as Record<string, HttpStatus>
        break
      case 'DiscussionError':
        mapping = discussionErrorMapping as Record<string, HttpStatus>
        break
      default:
        mapping = {}
    }

    const code = appError.code
    const details = appError.details

    return c.json(err(code, details), errorToStatus(code, mapping) as ContentfulHttpStatus)
  }

  // Sometimes Hono itself throws an error, like when a route is not found.
  // These usually have a 'status' property instead of a 'code'.
  if ('status' in error && typeof (error as HttpError).status === 'number') {
    const httpError = error as HttpError
    const status = httpError.status as ContentfulHttpStatus
    return c.json(err('http_error', httpError.message), status)
  }

  // If we arrive here, it means it is a big crash that we didn't expect (like database offline).
  // We log the real error for us to debug in the console, but we just send a generic 500 to the user
  // so we don't leak server secrets in production.
  logger.error({ err: error, path: c.req.path, method: c.req.method }, 'Unhandled internal error')

  return c.json(
    err('server_error', process.env.NODE_ENV === 'development' ? error.stack : undefined),
    HTTP_STATUS.INTERNAL_SERVER_ERROR
  )
}
