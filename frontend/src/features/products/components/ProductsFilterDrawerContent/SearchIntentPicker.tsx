import clsx from 'clsx'

import { Button } from '@/component/Button/Button'
import type { FilterGroupConfig, FilterValues } from '@/component/Filter/types'
import type { FilterKey } from '@/features/products/filters'
import {
  applySearchIntent,
  inferActiveIntent,
  intentDetail,
  isSearchIntentAvailable,
  SEARCH_INTENTS,
} from './SkincareFilterIntents'

type Props = {
  localFilters: FilterValues<FilterKey>
  groups: FilterGroupConfig<FilterKey>[]
  onFiltersChange: (filters: FilterValues<FilterKey>) => void
}

export function SearchIntentPicker({ localFilters, groups, onFiltersChange }: Props) {
  const activeIntent = inferActiveIntent(localFilters)

  return (
    <div className="skincare-filter-drawer__intents">
      {SEARCH_INTENTS.map((intent) => {
        const active = activeIntent?.id === intent.id

        return (
          <Button
            key={intent.id}
            variant="bare"
            className={clsx('skincare-filter-drawer__intent', active && 'is-active')}
            onClick={() => onFiltersChange(applySearchIntent(localFilters, intent))}
            aria-pressed={active}
            disabled={!isSearchIntentAvailable(intent, groups)}
          >
            <span>{intent.label}</span>
            <small>{intentDetail(intent)}</small>
          </Button>
        )
      })}
    </div>
  )
}
