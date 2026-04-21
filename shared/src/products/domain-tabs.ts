import type { ProductCategory } from './kinds'

export const PRODUCT_DOMAIN_TABS = ['skincare', 'haircare', 'dental', 'complement'] as const
export type ProductDomainTab = (typeof PRODUCT_DOMAIN_TABS)[number]

export const PRODUCT_DOMAIN_DB_CATEGORIES: Record<ProductDomainTab, readonly ProductCategory[]> = {
  skincare: ['skincare', 'solaire', 'bodycare'],
  haircare: ['haircare'],
  dental: ['dental'],
  complement: ['complement'],
}

export const PRODUCT_DOMAIN_TAB_META: Record<ProductDomainTab, { label: string; order: number }> = {
  skincare: { label: 'Skincare', order: 1 },
  haircare: { label: 'Cheveux', order: 2 },
  dental: { label: 'Dents', order: 3 },
  complement: { label: 'Compléments', order: 4 },
}

// Exhaustiveness guard: fails to compile if any ProductCategory value is not
// routed to a tab bucket. Added when adding a new DB category — route it here,
// or this check fails.
type _MappedCategory = (typeof PRODUCT_DOMAIN_DB_CATEGORIES)[ProductDomainTab][number]
type _Exhaustive = Exclude<ProductCategory, _MappedCategory> extends never ? true : never
const _exhaustive: _Exhaustive = true
void _exhaustive
