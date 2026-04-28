import { memo } from 'react'

import { FilterDrawer, type FilterGroupConfig, type FilterValues } from '@/component/Filter'
import { Toggle } from '@/component/Input/Toggle/Toggle'
import { PriceFilterAccordion } from '@/features/products/components/PriceFilterAccordion/PriceFilterAccordion'
import type { FilterKey } from '@/features/products/filters'

import '@/features/products/components/PriceFilterAccordion/PriceFilterAccordion.css'

type Props = {
  open: boolean
  onClose: () => void
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
      essentialExtras={
        <PriceFilterAccordion min={priceMin} max={priceMax} onChange={onPriceChange} />
      }
    >
      {showProfileToggle && (
        <Toggle
          label="Selon mon profil"
          hint="Signale les produits déconseillés pour votre type de peau"
          checked={profileFilter}
          onChange={onProfileFilterChange}
          size="sm"
        />
      )}
    </FilterDrawer>
  )
}

export const ProductsFilterDrawerContent = memo(ProductsFilterDrawerContentImpl)
