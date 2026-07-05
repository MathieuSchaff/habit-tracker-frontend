import { useCallback, useId, useMemo, useRef, useState } from 'react'

import { foldText } from '@/component/Search/text-fold'
import { useClickOutside } from '@/hooks/useClickOutside'
import { useFlipPlacement } from '@/hooks/useFlipPlacement'
import { useScrollActiveOptionIntoView } from '@/hooks/useScrollActiveOptionIntoView'
import { DismissButton } from '../AsyncSearchSelect/DismissButton'
import { Listbox } from '../AsyncSearchSelect/Listbox'
import { SelectedChips } from '../AsyncSearchSelect/SelectedChips'
import { useComboboxKeyboard } from '../AsyncSearchSelect/useComboboxKeyboard'
import { ComboboxTextInput } from '../ComboboxTextInput'
import type { FilterOption } from '../types'
import { useAnnouncement } from '../useAnnouncement'

import './SearchSelect.css'

type SearchSelectProps = {
  options: FilterOption[]
  selected: string[]
  onToggle: (value: string) => void
  placeholder?: string
  label: string
  'aria-labelledby'?: string
}

export function SearchSelect({
  options,
  selected,
  onToggle,
  placeholder,
  label,
  'aria-labelledby': ariaLabelledBy,
}: SearchSelectProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [announcement, setAnnouncement] = useAnnouncement()
  const clickOutsideContainer = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()

  // Lazy load long lists to keep the DOM small on first render.
  const PAGE_SIZE = 50
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  // Pre-fold labels once per options change to avoid re-normalizing on each keystroke.
  const foldedOptions = useMemo(
    () => options.map((o) => ({ option: o, foldedLabel: foldText(o.label) })),
    [options]
  )

  const filtered = useMemo(() => {
    const folded = foldText(query)
    const unselected = foldedOptions.filter(({ option }) => !selected.includes(option.value))
    const result = folded
      ? unselected.filter(({ foldedLabel }) => foldedLabel.includes(folded))
      : unselected
    return result.slice(0, visibleCount).map(({ option }) => option)
  }, [foldedOptions, selected, query, visibleCount])

  const selectedOptions = options.filter((o) => selected.includes(o.value))

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    if (scrollTop + clientHeight >= scrollHeight - 5) {
      setVisibleCount((prev) => prev + PAGE_SIZE)
    }
  }

  const dismiss = useCallback(() => {
    setIsOpen(false)
    setQuery('')
    setActiveIndex(-1)
    inputRef.current?.focus()
  }, [])

  const commitOption = useCallback(
    (opt: FilterOption) => {
      setAnnouncement(`${opt.label} ajouté`)
      onToggle(opt.value)
      setQuery('')
      setActiveIndex(-1)
    },
    [onToggle, setAnnouncement]
  )

  const handleKeyDown = useComboboxKeyboard({
    isOpen,
    setIsOpen,
    activeIndex,
    setActiveIndex,
    filtered,
    inputRef,
    onSelect: commitOption,
  })

  useFlipPlacement(clickOutsideContainer, dropdownRef, isOpen, [], '.filter-drawer__body')

  useClickOutside(clickOutsideContainer, () => {
    setIsOpen(false)
    setQuery('')
    setActiveIndex(-1)
  })

  useScrollActiveOptionIntoView(activeIndex, isOpen, listboxId)

  return (
    <div className="search-select">
      <SelectedChips options={selectedOptions} onRemove={onToggle} />
      <div ref={clickOutsideContainer}>
        <div className="search-select__input-wrapper">
          <ComboboxTextInput
            inputRef={inputRef}
            value={query}
            placeholder={placeholder}
            label={label}
            ariaLabelledBy={ariaLabelledBy}
            listboxId={listboxId}
            activeIndex={activeIndex}
            expanded={isOpen}
            onChange={(v) => {
              setQuery(v)
              setIsOpen(true)
              setActiveIndex(-1)
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
          />
          {isOpen && <DismissButton onDismiss={dismiss} />}
        </div>

        {isOpen && filtered.length > 0 && (
          <Listbox
            ref={dropdownRef}
            id={listboxId}
            label={label}
            filtered={filtered}
            activeIndex={activeIndex}
            onScroll={handleScroll}
            onSelect={(opt) => {
              commitOption(opt)
              inputRef.current?.focus()
            }}
          />
        )}

        {isOpen && query && filtered.length === 0 && (
          <p className="search-select__empty">Aucun résultat</p>
        )}

        <div className="sr-only" aria-live="assertive" aria-atomic="true">
          {announcement}
        </div>
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {isOpen && query.length > 0
            ? filtered.length > 0
              ? `${filtered.length} résultat${filtered.length > 1 ? 's' : ''} disponible${filtered.length > 1 ? 's' : ''}`
              : 'Aucun résultat'
            : ''}
        </div>
      </div>
    </div>
  )
}
