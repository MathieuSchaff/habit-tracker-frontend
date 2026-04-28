import { memo, useCallback } from 'react'

import {
  ActiveFiltersBar,
  type ExtraChip,
  type FilterGroupConfig,
  getFilterLabel,
} from '@/component/Filter'
import { type FilterKey, GROUP_LABELS } from '@/features/products/filters'

type Props = {
  activeTags: { key: FilterKey; value: string }[]
  filterGroups: FilterGroupConfig<FilterKey>[]
  onRemoveTag: (key: FilterKey, value: string) => void
  onClearAll: () => void
  extraChips: ExtraChip[]
}

function ProductsActiveBarImpl({
  activeTags,
  filterGroups,
  onRemoveTag,
  onClearAll,
  extraChips,
}: Props) {
  const labelFor = useCallback(
    (key: FilterKey, value: string) => getFilterLabel(filterGroups, key, value),
    [filterGroups]
  )
  return (
    <ActiveFiltersBar
      activeTags={activeTags}
      groupLabels={GROUP_LABELS}
      getFilterLabel={labelFor}
      onRemoveTag={onRemoveTag}
      onClearAll={onClearAll}
      extraChips={extraChips}
    />
  )
}

export const ProductsActiveBar = memo(ProductsActiveBarImpl)
