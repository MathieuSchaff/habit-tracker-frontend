import type { HttpStatus } from '../core'
import { HTTP_STATUS } from '../core'
import type { ProductErrorCode } from './types'

/**
 * Mapping des codes d'erreur products vers les status HTTP correspondants.
 *
 * @remarks
 * Utilisé avec {@link errorToStatus} pour résoudre le status HTTP
 * à partir d'un code d'erreur product.
 * @example
 * const status = errorToStatus(error.code, productErrorMapping)
 * return c.json(err(error.code), status)
 */
export const productErrorMapping = {
  product_not_found: HTTP_STATUS.NOT_FOUND,
  product_creation_failed: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  product_update_failed: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  product_delete_failed: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  product_already_exists: HTTP_STATUS.CONFLICT,
  stock_update_failed: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  unauthorized_access: HTTP_STATUS.FORBIDDEN,
  database_error: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  no_updatable_fields: HTTP_STATUS.BAD_REQUEST,
} as const satisfies Record<ProductErrorCode, HttpStatus>
