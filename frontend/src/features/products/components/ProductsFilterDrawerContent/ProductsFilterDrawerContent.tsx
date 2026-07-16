import type { ProductDomainTab } from '@aurore/shared'

import { memo } from 'react'

import { FilterDrawer, type FilterGroupConfig, type FilterValues } from '@/component/Filter'
import { Toggle } from '@/component/Input/Toggle/Toggle'
import { PriceFilterAccordion } from '@/features/products/components/PriceFilterAccordion/PriceFilterAccordion'
import type { FilterKey } from '@/features/products/filters'
import { PRODUCTS_FILTER_DRAWER_COPY } from './ProductsFilterDrawerContent.copy'
import { SkincareFilterDrawerBody } from './SkincareFilterDrawerBody'

type Props = {
  open: boolean
  onClose: () => void
  category: ProductDomainTab
  groups: FilterGroupConfig<FilterKey>[]
  currentFilters: FilterValues<FilterKey>
  initialFilters: FilterValues<FilterKey>
  onApply: (next: FilterValues<FilterKey>) => void
  onReset: () => void
  showProfileToggle: boolean
  profileFilter: boolean
  onProfileFilterChange: (checked: boolean) => void
  priceMin?: number
  priceMax?: number
  onPriceChange: (range: { min?: number; max?: number }) => void
  previewCount?: number
  onLocalFiltersChange?: (filters: FilterValues<FilterKey>) => void
}

function ProductsFilterDrawerContentImpl({
  open,
  onClose,
  category,
  groups,
  currentFilters,
  initialFilters,
  onApply,
  onReset,
  showProfileToggle,
  profileFilter,
  onProfileFilterChange,
  priceMin,
  priceMax,
  onPriceChange,
  previewCount,
  onLocalFiltersChange,
}: Props) {
  const isSkincare = category === 'skincare'
  const priceFilter = (
    <PriceFilterAccordion min={priceMin} max={priceMax} onChange={onPriceChange} />
  )

  return (
    <FilterDrawer
      open={open}
      onClose={onClose}
      groups={groups}
      currentFilters={currentFilters}
      initialFilters={initialFilters}
      onApply={onApply}
      onReset={onReset}
      previewCount={previewCount}
      onLocalFiltersChange={onLocalFiltersChange}
      renderBody={
        isSkincare
          ? ({ localFilters, onToggle, onFiltersChange }) => {
              return (
                <SkincareFilterDrawerBody
                  groups={groups}
                  localFilters={localFilters}
                  onToggle={onToggle}
                  onFiltersChange={onFiltersChange}
                  priceFilter={priceFilter}
                />
              )
            }
          : undefined
      }
      advancedExtras={isSkincare ? undefined : priceFilter}
    >
      {showProfileToggle && (
        <Toggle
          label={PRODUCTS_FILTER_DRAWER_COPY.profileToggleLabel}
          hint={PRODUCTS_FILTER_DRAWER_COPY.profileToggleHint}
          checked={profileFilter}
          onChange={onProfileFilterChange}
          size="sm"
        />
      )}
    </FilterDrawer>
  )
}

export const ProductsFilterDrawerContent = memo(ProductsFilterDrawerContentImpl)
