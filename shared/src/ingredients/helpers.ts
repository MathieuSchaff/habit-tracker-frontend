import type { HttpStatus } from '../core'
import { HTTP_STATUS } from '../core'
import type { IngredientErrorCode } from './types'

export const ingredientErrorMapping = {
  ingredient_not_found: HTTP_STATUS.NOT_FOUND,
  ingredient_creation_failed: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  ingredient_update_failed: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  ingredient_delete_failed: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  ingredient_already_exists: HTTP_STATUS.CONFLICT,
  unauthorized_access: HTTP_STATUS.FORBIDDEN,
  database_error: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  slug_already_exists: HTTP_STATUS.CONFLICT,
  ingredient_update_conflict: HTTP_STATUS.CONFLICT,
} as const satisfies Record<IngredientErrorCode, HttpStatus>
