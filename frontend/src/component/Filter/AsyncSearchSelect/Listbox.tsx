import type { FilterOption } from '../types'

type Props = {
  id: string
  label: string
  filtered: FilterOption[]
  activeIndex: number
  onSelect: (opt: FilterOption) => void
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void
  ref?: React.Ref<HTMLDivElement>
}

export function Listbox({ id, label, filtered, activeIndex, onSelect, onScroll, ref }: Props) {
  return (
    <div
      ref={ref}
      id={id}
      className="search-select__dropdown"
      role="listbox"
      aria-label={`Suggestions pour ${label}`}
      onScroll={onScroll}
    >
      {filtered.map((opt, index) => {
        const isActive = index === activeIndex
        return (
          // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard nav is on the combobox input via aria-activedescendant
          <div
            key={opt.value}
            role="option"
            id={`${id}-option-${index}`}
            aria-selected={isActive}
            tabIndex={-1}
            className={`search-select__option-wrapper${isActive ? ' search-select__option--active' : ''}`}
            onClick={() => onSelect(opt)}
          >
            <span className="search-select__option">{opt.label}</span>
          </div>
        )
      })}
    </div>
  )
}
