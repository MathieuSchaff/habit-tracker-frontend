// Schemas (runtime validators + inferred types)

export * from './schemas/api'
export * from './schemas/auth'
export * from './schemas/habits'
export * from './schemas/ingredients'
export * from './schemas/logs'
export * from './schemas/product-ingredients'
export * from './schemas/products'
export * from './schemas/profile'
export * from './schemas/stock'
export * from './schemas/tags'

// Types (entity types, error codes, composed types)

// Types (entity types, error codes, composed types)

export type * from './types/api'
export type * from './types/auth'
export type * from './types/common'
export type * from './types/habits'
export type {
  CreateIngredientInput,
  EditableIngredientKeys,
  Ingredient,
  IngredientChanges,
  IngredientEdit,
  IngredientErrorCode,
  UpdateIngredientInput,
} from './types/ingredients'
export type { LogsErrorCode } from './types/logs'
export type * from './types/product-ingredients'
export type {
  EditableProductKeys,
  Product,
  ProductChanges,
  ProductEdit,
  ProductErrorCode,
  ProductSearchResult,
  ProductStock,
  ProductWithStock,
} from './types/products'
export type * from './types/profile'
export type { StockErrorCode } from './types/stock'
export type { IngredientTag, ProductTag, Tag, TagErrorCode } from './types/tags'

// Helpers (error mappings, constants, utilities)

export * from './helpers/api'
export * from './helpers/auth'
export * from './helpers/constants'
export * from './helpers/habits'
export * from './helpers/ingredients'
export * from './helpers/logs'
export * from './helpers/product-ingredients'
export * from './helpers/products'
export * from './helpers/profile'
export * from './helpers/stock'
export * from './helpers/tags'

// OpenAPI

export * from './openapi/responses'
