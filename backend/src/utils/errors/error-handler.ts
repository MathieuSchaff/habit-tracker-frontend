import {
  articleErrorMapping,
  type ContentfulHttpStatus,
  discussionErrorMapping,
  err,
  errorToStatus,
  HTTP_STATUS,
  type HttpStatus,
  ingredientErrorMapping,
  productComparisonErrorMapping,
  productErrorMapping,
  productIngredientErrorMapping,
  purchaseErrorMapping,
  tagErrorMapping,
  taskErrorMapping,
  userProductErrorMapping,
} from '@aurore/shared'

import type { Context } from 'hono'

import type { AppEnv } from '../../app-env'
import { db } from '../../db'
import { trackError } from '../../features/errors/service'
import { logger } from '../../lib/logger'

interface AppError extends Error {
  code: string
  details?: unknown
}

interface HttpError extends Error {
  status: number
}

const errorMappingRegistry = new Map<string, Record<string, HttpStatus>>([
  ['ProductError', productErrorMapping as Record<string, HttpStatus>],
  ['ProductComparisonError', productComparisonErrorMapping as Record<string, HttpStatus>],
  ['IngredientError', ingredientErrorMapping as Record<string, HttpStatus>],
  ['ProductIngredientError', productIngredientErrorMapping as Record<string, HttpStatus>],
  ['PurchaseError', purchaseErrorMapping as Record<string, HttpStatus>],
  ['TagError', tagErrorMapping as Record<string, HttpStatus>],
  ['TaskError', taskErrorMapping as Record<string, HttpStatus>],
  ['UserProductError', userProductErrorMapping as Record<string, HttpStatus>],
  ['BlogError', articleErrorMapping as Record<string, HttpStatus>],
  ['DiscussionError', discussionErrorMapping as Record<string, HttpStatus>],
])

export async function globalErrorHandler(error: Error, c: Context<AppEnv>) {
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
    logger.warn({ err: httpError, path: c.req.path, method: c.req.method }, 'HTTP error')
    // Don't leak arbitrary error messages (libs/framework) to clients in prod; keep them server-side.
    return c.json(
      err('http_error', process.env.NODE_ENV === 'development' ? httpError.message : undefined),
      status
    )
  }

  logger.error({ err: error, path: c.req.path, method: c.req.method }, 'Unhandled internal error')

  // Persist for the admin error view. Off-tx (base db): the request tx is aborted here.
  try {
    await trackError(db, {
      source: 'backend',
      message: error.message || error.name || 'Unknown error',
      stack: error.stack,
      context: { path: c.req.path, method: c.req.method },
      userId: c.get('userId') ?? null,
    })
  } catch (trackErr) {
    logger.error({ err: trackErr }, 'Failed to persist backend error')
  }

  return c.json(
    err('server_error', process.env.NODE_ENV === 'development' ? error.stack : undefined),
    HTTP_STATUS.INTERNAL_SERVER_ERROR
  )
}
