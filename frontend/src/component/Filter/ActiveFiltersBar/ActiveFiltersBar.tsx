import { Button } from '@/component/Button/Button'

import './ActiveFiltersBar.css'

type ActiveFiltersBarProps<T extends string> = {
  activeTags: { key: T; value: string }[]
  groupLabels: Record<T, string>
  getFilterLabel: (key: T, value: string) => string
  onRemoveTag: (key: T, value: string) => void
  onClearAll: () => void
}

export function ActiveFiltersBar<T extends string>({
  activeTags,
  groupLabels,
  getFilterLabel,
  onRemoveTag,
  onClearAll,
}: ActiveFiltersBarProps<T>) {
  if (activeTags.length === 0) {
    return null
  }

  return (
    // polite so screen readers announce when filters change
    <div className="list-active-filters" aria-live="polite">
      {activeTags.map(({ key, value }) => (
        <button
          key={`${key}-${value}`}
          type="button"
          className="list-active-filter-tag"
          onClick={() => onRemoveTag(key, value)}
          aria-label={`Retirer le filtre ${getFilterLabel(key, value)}`}
        >
          <span className="list-active-filter-tag__prefix">{groupLabels[key]}:</span>
          {getFilterLabel(key, value)}
          <span className="list-active-filter-tag__x" aria-hidden="true">
            &times;
          </span>
        </button>
      ))}
      <Button
        variant="ghost"
        size="sm"
        className="list-clear-all"
        onClick={onClearAll}
        aria-label="Retirer tous les filtres"
      >
        Tout effacer
      </Button>
    </div>
  )
}
