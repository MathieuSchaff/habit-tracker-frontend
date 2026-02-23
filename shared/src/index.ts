// Schemas (runtime validators + inferred types)

export * from './schemas/api'
export * from './schemas/auth'
export * from './schemas/habits'
export * from './schemas/ingredients'
export * from './schemas/product-ingredients'
export * from './schemas/products'
export * from './schemas/profile'
export * from './schemas/tags'

// Types (entity types, error codes, composed types)

export * from './types/api'
export * from './types/auth'
export * from './types/common'
export * from './types/habits'
export type {
  CreateIngredientInput,
  EditableIngredientKeys,
  Ingredient,
  IngredientChanges,
  IngredientEdit,
  IngredientErrorCode,
  UpdateIngredientInput,
} from './types/ingredients'
export * from './types/product-ingredients'
export type {
  EditableProductKeys,
  Product,
  ProductChanges,
  ProductEdit,
  ProductErrorCode,
  ProductStock,
  ProductWithStock,
} from './types/products'
export * from './types/profile'
export type { IngredientTag, ProductTag, Tag, TagErrorCode } from './types/tags'

// Helpers (error mappings, constants, utilities)

export * from './helpers/api'
export * from './helpers/auth'
export * from './helpers/constants'
export * from './helpers/habits'
export * from './helpers/ingredients'
export * from './helpers/product-ingredients'
export * from './helpers/products'
export * from './helpers/profile'
export * from './helpers/tags'

// OpenAPI

export * from './openapi/responses'
