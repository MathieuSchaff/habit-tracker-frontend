import { FilterDrawer, type FilterGroupConfig, type FilterValues } from '@/component/Filter'
import { Toggle } from '@/component/Input/Toggle/Toggle'
import { PriceRangeFilter } from '@/features/products/components/PriceRangeFilter/PriceRangeFilter'
import type { FilterKey } from '@/features/products/filters'

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
}

export function ProductsFilterDrawerContent({
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
      <PriceRangeFilter min={priceMin} max={priceMax} onChange={onPriceChange} />
    </FilterDrawer>
  )
}
