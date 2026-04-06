import { ChevronDown } from 'lucide-react'
import { useId, useRef, useState } from 'react'

import { ChipGroup } from '@/component/Input/ChipGroup/ChipGroup'
import { SearchSelect } from '../SearchSelect/SearchSelect'
import type { FilterGroupConfig, FilterValues } from '../types'
import { SubGroupedChips } from './SubGroupedChips'

import './FilterAccordion.css'

// One accordion section inside the filter drawer.
// It contains one or more sub-filters, each rendered
// as chips, sub-grouped chips, or a search-select.
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
  const [isOpen, setIsOpen] = useState(group.defaultOpen || totalSelected > 0)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const contentId = useId()
  const headerId = useId()

  // pressing Escape inside the chips closes this accordion
  // and puts focus back on the trigger button
  const escapeHandler = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      e.preventDefault()
      setIsOpen(false)
      buttonRef.current?.focus()
    }
  }

  return (
    <div className={`filter-accordion filter-accordion--${group.tier}`}>
      {/* h3 wraps the trigger so screen readers can navigate between sections via headings */}
      <h3 className="filter-accordion__heading">
        <button
          type="button"
          id={headerId}
          className="filter-accordion__trigger"
          onClick={() => setIsOpen((v) => !v)}
          aria-expanded={isOpen}
          aria-controls={contentId}
          ref={buttonRef}
        >
          <span className="filter-accordion__label">{group.label}</span>
          <div className="filter-accordion__meta">
            {totalSelected > 0 && (
              <span className="filter-accordion__count" title={`${totalSelected} filtres actifs`}>
                {totalSelected}
              </span>
            )}
            <ChevronDown
              size={14}
              className="filter-accordion__chevron"
              style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}
              aria-hidden="true"
            />
          </div>
        </button>
      </h3>
      {/* inert blocks focus + screen readers when closed, like hidden does,
          but keeps the element in the DOM so the CSS grid animation still works */}
      <section
        id={contentId}
        className="filter-accordion__body"
        aria-labelledby={headerId}
        style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
        aria-hidden={!isOpen}
        inert={!isOpen ? true : undefined}
      >
        <div className="filter-accordion__inner">
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

            if (sf.subGroups) {
              return (
                <SubGroupedChips
                  key={sf.key}
                  field={sf}
                  selected={selected}
                  onToggle={(value) => onToggle(sf.key, value)}
                  isAccordionOpen={isOpen}
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
                  className="filter-accordion__chips"
                  chipTabIndex={isOpen ? 0 : -1}
                  onChipKeyDown={escapeHandler}
                  aria-label={`Options pour ${sf.label}`}
                />
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
