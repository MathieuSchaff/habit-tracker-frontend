import type { HttpStatus } from '../core'
import { HTTP_STATUS } from '../core'
import type { DermoSignal } from './dermo-signals'

export type ComparisonPriceUnit = 'ml' | 'g' | 'unit'

export type EnrichedComparisonProduct = {
  id: string
  name: string
  brand: string
  kind: string
  slug: string
  imageUrl: string | null
  totalAmount: number | null
  amountUnit: string | null
  priceCents: number | null
  pricePer: { unit: ComparisonPriceUnit; cents: number } | null
  ingredients: Array<{
    id: string
    inciName: string
    slug: string
    position: number
    signals: DermoSignal[]
  }>
  tags: Array<{ slug: string; tagType: string; relevance: 'primary' | 'secondary' }>
}

export type EnrichedComparison = {
  id: string
  name: string | null
  createdAt: string
  products: EnrichedComparisonProduct[]
}

export type ComparisonSummary = {
  id: string
  name: string | null
  productCount: number
  createdAt: string
}

export type ProductComparisonErrorCode =
  | 'comparison_not_found'
  | 'comparison_invalid_products'
  | 'comparison_too_few_products'
  | 'comparison_too_many_products'
  | 'unauthorized_access'

export const productComparisonErrorMapping = {
  comparison_not_found: HTTP_STATUS.NOT_FOUND,
  comparison_invalid_products: HTTP_STATUS.BAD_REQUEST,
  comparison_too_few_products: HTTP_STATUS.BAD_REQUEST,
  comparison_too_many_products: HTTP_STATUS.BAD_REQUEST,
  unauthorized_access: HTTP_STATUS.FORBIDDEN,
} as const satisfies Record<ProductComparisonErrorCode, HttpStatus>

export const COMPARISON_MIN_PRODUCTS = 2
export const COMPARISON_MAX_PRODUCTS = 8
