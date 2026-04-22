import type { HttpStatus } from '../core'
import { HTTP_STATUS } from '../core'
import { type DentalProductTagCategory, dentalProductFilterCategories } from './dental'
import type { ProductDomainTab } from './domain-tabs'
import { type HaircareProductTagCategory, haircareProductFilterCategories } from './haircare'
import { type SkincareProductTagCategory, skincareProductFilterCategories } from './skincare'
import { type SupplementProductTagCategory, supplementProductFilterCategories } from './supplement'
import type { ProductErrorCode } from './types'

export const productErrorMapping = {
  product_not_found: HTTP_STATUS.NOT_FOUND,
  product_creation_failed: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  product_update_failed: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  product_delete_failed: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  product_already_exists: HTTP_STATUS.CONFLICT,
  unauthorized_access: HTTP_STATUS.FORBIDDEN,
  database_error: HTTP_STATUS.INTERNAL_SERVER_ERROR,
} as const satisfies Record<ProductErrorCode, HttpStatus>

export type AllProductTagCategory =
  | SkincareProductTagCategory
  | HaircareProductTagCategory
  | DentalProductTagCategory
  | SupplementProductTagCategory

// Maps each domain tab to its tag filter category keys.
// Used by both frontend (buildProductsApiFilters, filterSearchSchema) and backend
// (getFilterOptions — future fix).
export const DOMAIN_PRODUCT_FILTER_CATEGORIES: Record<
  ProductDomainTab,
  readonly AllProductTagCategory[]
> = {
  skincare: skincareProductFilterCategories(),
  haircare: haircareProductFilterCategories(),
  dental: dentalProductFilterCategories(),
  complement: supplementProductFilterCategories(), // tab "complement" → domaine supplement
}
