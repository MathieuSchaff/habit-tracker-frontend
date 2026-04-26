import { Button } from '@/component/Button/Button'

import './ActiveFiltersBar.css'

export type ExtraChip = {
  id: string
  prefix: string
  label: string
  onRemove: () => void
}

type ActiveFiltersBarProps<T extends string> = {
  activeTags: { key: T; value: string }[]
  groupLabels: Record<T, string>
  getFilterLabel: (key: T, value: string) => string
  onRemoveTag: (key: T, value: string) => void
  onClearAll: () => void
  extraChips?: ExtraChip[]
}

export function ActiveFiltersBar<T extends string>({
  activeTags,
  groupLabels,
  getFilterLabel,
  onRemoveTag,
  onClearAll,
  extraChips,
}: ActiveFiltersBarProps<T>) {
  const extras = extraChips ?? []
  if (activeTags.length === 0 && extras.length === 0) {
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
      {extras.map((chip) => (
        <button
          key={chip.id}
          type="button"
          className="list-active-filter-tag"
          onClick={chip.onRemove}
          aria-label={`Retirer le filtre ${chip.prefix} ${chip.label}`}
        >
          <span className="list-active-filter-tag__prefix">{chip.prefix}:</span>
          {chip.label}
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
