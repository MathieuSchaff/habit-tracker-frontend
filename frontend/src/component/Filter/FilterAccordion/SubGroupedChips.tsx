import { useMemo } from 'react'

import { ChipGroup } from '@/component/Input/ChipGroup/ChipGroup'
import type { FilterOption, GroupedFilterField } from '../types'

export function SubGroupedChips<T extends string>({
  field,
  selected,
  onToggle,
  escapeHandler,
}: {
  field: GroupedFilterField<T>
  selected: string[]
  onToggle: (value: string) => void
  escapeHandler: (e: React.KeyboardEvent) => void
}) {
  const handleChange = (newSelected: string[]) => {
    const added = newSelected.find((v) => !selected.includes(v))
    const removed = selected.find((v) => !newSelected.includes(v))
    const value = added ?? removed
    if (value) onToggle(value)
  }

  // 70+ chip categories per FilterAccordion: rebuild on every render is the cost
  // the native <details> opt-out was meant to avoid.
  const optionsBySlug = useMemo(
    () => new Map(field.options.map((o) => [o.value, o])),
    [field.options]
  )

  if (!field.subGroups) {
    return (
      <ChipGroup
        options={field.options}
        selected={selected}
        onChange={handleChange}
        size="sm"
        className="filter-accordion__chips"
        onChipKeyDown={escapeHandler}
        aria-label={`Options pour ${field.label}`}
      />
    )
  }

  return (
    <div className="filter-subgroups">
      {field.subGroups.map((sg) => {
        const sgOptions = sg.slugs
          .map((slug) => optionsBySlug.get(slug))
          .filter((o): o is FilterOption => o != null)
        if (sgOptions.length === 0) return null
        return (
          <fieldset key={sg.label} className="filter-subgroup">
            <legend className="filter-subgroup__label">{sg.label}</legend>
            <ChipGroup
              options={sgOptions}
              selected={selected}
              onChange={handleChange}
              maxVisible={sg.maxVisible}
              size="sm"
              onChipKeyDown={escapeHandler}
              aria-label={sg.label}
            />
          </fieldset>
        )
      })}
    </div>
  )
}
