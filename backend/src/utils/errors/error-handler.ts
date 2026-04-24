import {
  articleErrorMapping,
  authErrorMapping,
  type ContentfulHttpStatus,
  discussionErrorMapping,
  err,
  errorToStatus,
  HTTP_STATUS,
  type HttpStatus,
  habitErrorMapping,
  ingredientErrorMapping,
  productErrorMapping,
  productIngredientErrorMapping,
  purchaseErrorMapping,
  tagErrorMapping,
  taskErrorMapping,
  userProductErrorMapping,
} from '@habit-tracker/shared'

import type { Context } from 'hono'

import { logger } from '../../lib/logger'

interface AppError extends Error {
  code: string
  details?: unknown
}

interface HttpError extends Error {
  status: number
}

const errorMappingRegistry = new Map<string, Record<string, HttpStatus>>([
  ['AuthError', authErrorMapping as Record<string, HttpStatus>],
  ['HabitError', habitErrorMapping as Record<string, HttpStatus>],
  ['ProductError', productErrorMapping as Record<string, HttpStatus>],
  ['IngredientError', ingredientErrorMapping as Record<string, HttpStatus>],
  ['ProductIngredientError', productIngredientErrorMapping as Record<string, HttpStatus>],
  ['PurchaseError', purchaseErrorMapping as Record<string, HttpStatus>],
  ['TagError', tagErrorMapping as Record<string, HttpStatus>],
  ['TaskError', taskErrorMapping as Record<string, HttpStatus>],
  ['UserProductError', userProductErrorMapping as Record<string, HttpStatus>],
  ['BlogError', articleErrorMapping as Record<string, HttpStatus>],
  ['DiscussionError', discussionErrorMapping as Record<string, HttpStatus>],
])

export async function globalErrorHandler(error: Error, c: Context) {
  if ('code' in error && typeof (error as AppError).code === 'string') {
    const appError = error as AppError
    const mapping = errorMappingRegistry.get(appError.constructor.name) ?? {}
    const code = appError.code
    const details = appError.details

    return c.json(err(code, details), errorToStatus(code, mapping) as ContentfulHttpStatus)
  }

  if ('status' in error && typeof (error as HttpError).status === 'number') {
    const httpError = error as HttpError
    const status = httpError.status as ContentfulHttpStatus
    return c.json(err('http_error', httpError.message), status)
  }

  logger.error({ err: error, path: c.req.path, method: c.req.method }, 'Unhandled internal error')

  return c.json(
    err('server_error', process.env.NODE_ENV === 'development' ? error.stack : undefined),
    HTTP_STATUS.INTERNAL_SERVER_ERROR
  )
}
