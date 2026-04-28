import { ChevronDown } from 'lucide-react'
import { useId, useRef, useState } from 'react'

import { ChipGroup } from '@/component/Input/ChipGroup/ChipGroup'
import { AsyncSearchSelect } from '../AsyncSearchSelect/AsyncSearchSelect'
import { SearchSelect } from '../SearchSelect/SearchSelect'
import type { FilterGroupConfig, FilterValues } from '../types'
import { SubGroupedChips } from './SubGroupedChips'

import './FilterAccordion.css'

// One accordion section inside the filter drawer.
// Built on native <details>/<summary> so the open/close state lives in the
// browser, not React. Toggling does not re-render the chip list — critical
// for categories with 70+ chips where React reconciliation alone causes a
// visible freeze on each toggle.
export function FilterAccordion<T extends string>({
  group,
  localFilters,
  onToggle,
}: {
  group: FilterGroupConfig<T>
  localFilters: FilterValues<T>
  onToggle: (key: T, value: string) => void
}) {
  const totalSelected = group.subFilters.reduce(
    (sum, sf) => sum + (localFilters[sf.key]?.length ?? 0),
    0
  )
  // Lock the initial open state at mount; the browser owns it after.
  // Stable across re-renders so React never re-asserts `open` and overrides
  // a native toggle.
  const [initialOpen] = useState(() => group.defaultOpen || totalSelected > 0)
  const detailsRef = useRef<HTMLDetailsElement>(null)
  const summaryRef = useRef<HTMLElement>(null)
  const contentId = useId()

  // Escape inside a chip closes the accordion and refocuses the summary.
  // Without this, Escape would bubble to the parent <dialog> and close the
  // whole drawer — too aggressive when the user just wants to back out of
  // a single section.
  const escapeHandler = (e: React.KeyboardEvent) => {
    if (e.key !== 'Escape') return
    const details = detailsRef.current
    if (!details?.open) return
    e.stopPropagation()
    e.preventDefault()
    details.open = false
    summaryRef.current?.focus()
  }

  return (
    <details
      ref={detailsRef}
      className={`filter-accordion filter-accordion--${group.tier}`}
      open={initialOpen}
    >
      <summary
        ref={summaryRef as React.RefObject<HTMLElement>}
        className="filter-accordion__trigger"
        aria-controls={contentId}
      >
        {/* h3 inside <summary> keeps screen-reader heading navigation
            without breaking <summary>'s required first-child position. */}
        <h3 className="filter-accordion__label">{group.label}</h3>
        <div className="filter-accordion__meta">
          {totalSelected > 0 && (
            <span className="filter-accordion__count" title={`${totalSelected} filtres actifs`}>
              {totalSelected}
            </span>
          )}
          <ChevronDown size={14} className="filter-accordion__chevron" aria-hidden="true" />
        </div>
      </summary>
      <div id={contentId} className="filter-accordion__body">
        {group.subFilters.map((sf) => {
          const selected = localFilters[sf.key] ?? []
          const variant = sf.variant ?? 'chips'

          if (variant === 'search-select') {
            return (
              <div key={sf.key} className="filter-drawer__group filter-drawer__group--nested">
                <span className="filter-subgroup__label">{sf.label}</span>
                <SearchSelect
                  options={sf.options}
                  selected={selected}
                  onToggle={(value) => onToggle(sf.key, value)}
                  placeholder={sf.placeholder}
                  label={sf.label}
                />
              </div>
            )
          }

          if (variant === 'async-search-select') {
            if (!sf.loadOptionsQuery || !sf.resolveValuesQuery) return null
            return (
              <div key={sf.key} className="filter-drawer__group filter-drawer__group--nested">
                <span className="filter-subgroup__label">{sf.label}</span>
                <AsyncSearchSelect
                  selected={selected}
                  onToggle={(value) => onToggle(sf.key, value)}
                  loadOptionsQuery={sf.loadOptionsQuery}
                  resolveValuesQuery={sf.resolveValuesQuery}
                  placeholder={sf.placeholder}
                  label={sf.label}
                />
              </div>
            )
          }

          if (sf.subGroups) {
            return (
              <SubGroupedChips
                key={sf.key}
                field={sf}
                selected={selected}
                onToggle={(value) => onToggle(sf.key, value)}
                escapeHandler={escapeHandler}
              />
            )
          }

          return (
            <div key={sf.key} className="filter-subgroup">
              {group.subFilters.length > 1 && (
                <span className="filter-subgroup__label" aria-hidden="true">
                  {sf.label}
                </span>
              )}
              <ChipGroup
                options={sf.options}
                selected={selected}
                onChange={(newSelected) => {
                  const added = newSelected.find((v) => !selected.includes(v))
                  const removed = selected.find((v) => !newSelected.includes(v))
                  const value = added ?? removed
                  if (value) onToggle(sf.key, value)
                }}
                size="sm"
                onChipKeyDown={escapeHandler}
                aria-label={`Options pour ${sf.label}`}
              />
            </div>
          )
        })}
      </div>
    </details>
  )
}
