import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'

import { useClickOutside } from '@/hooks/useClickOutside'
import { useDebounce } from '@/hooks/useDebounce'
import { useFlipPlacement } from '@/hooks/useFlipPlacement'
import type { AsyncSearchQueryFactory, FilterOption } from '../types'
import { DismissButton } from './DismissButton'
import { DropdownStatus } from './DropdownStatus'
import { Listbox } from './Listbox'
import { SelectedChips } from './SelectedChips'
import { useComboboxKeyboard } from './useComboboxKeyboard'
import { useLabelCache } from './useLabelCache'

import '../SearchSelect/SearchSelect.css'

type AsyncSearchSelectProps = {
  selected: string[]
  onToggle: (value: string) => void
  // Loosely typed at the prop level — the type union of all possible factories
  // is impractical to thread; FilterAccordion validates presence at the call site.
  // biome-ignore lint/suspicious/noExplicitAny: see comment above
  loadOptionsQuery: AsyncSearchQueryFactory<string, any>
  // biome-ignore lint/suspicious/noExplicitAny: see comment above
  resolveValuesQuery: AsyncSearchQueryFactory<string[], any>
  placeholder?: string
  label: string
  minChars?: number
  debounce?: number
  'aria-labelledby'?: string
}

// Async sibling of SearchSelect: same UX, but options come from a remote
// search and selected chips are resolved server-side. Used when the option
// list is too large to ship to the client (e.g. ingredients catalog).
export function AsyncSearchSelect({
  selected,
  onToggle,
  loadOptionsQuery,
  resolveValuesQuery,
  placeholder,
  label,
  minChars = 2,
  debounce = 250,
  'aria-labelledby': ariaLabelledBy,
}: AsyncSearchSelectProps) {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, debounce)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    if (!announcement) return
    const t = setTimeout(() => setAnnouncement(''), 1000)
    return () => clearTimeout(t)
  }, [announcement])

  const clickOutsideContainer = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()

  const optionsQuery = useQuery({
    ...loadOptionsQuery(debouncedQuery),
    enabled: debouncedQuery.length >= minChars,
  })

  // Batch rapid chip toggles into a single resolve fetch; chips still render
  // immediately via useLabelCache slug fallback while the debounce holds.
  const debouncedSelected = useDebounce(selected, 300)
  const resolvedQuery = useQuery({
    ...resolveValuesQuery(debouncedSelected),
    enabled: debouncedSelected.length > 0,
  })

  const labelCache = useLabelCache(resolvedQuery.data, optionsQuery.data)

  const filtered = useMemo<FilterOption[]>(() => {
    const data: FilterOption[] = optionsQuery.data ?? []
    return data.filter((o) => !selected.includes(o.value))
  }, [optionsQuery.data, selected])

  const selectedOptions = useMemo(
    () => selected.map((value) => ({ value, label: labelCache[value] ?? value })),
    [selected, labelCache]
  )

  const showDropdown = isOpen && debouncedQuery.length >= minChars
  const isLoading = optionsQuery.isFetching && debouncedQuery.length >= minChars
  const isError = optionsQuery.isError && debouncedQuery.length >= minChars

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
    [onToggle]
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

  // filtered.length is a deps trigger: listbox only mounts when results exist,
  // which can lag showDropdown by one render (async query). Without it, ref is
  // null on first run and inline coords stay empty.
  useFlipPlacement(
    clickOutsideContainer,
    dropdownRef,
    showDropdown,
    [filtered.length],
    '.filter-drawer__body'
  )

  useClickOutside(clickOutsideContainer, () => {
    setIsOpen(false)
    setQuery('')
    setActiveIndex(-1)
  })

  useEffect(() => {
    if (activeIndex >= 0 && isOpen) {
      const element = document.getElementById(`${listboxId}-option-${activeIndex}`)
      element?.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex, isOpen, listboxId])

  return (
    <div className="search-select">
      <SelectedChips options={selectedOptions} onRemove={onToggle} />
      <div ref={clickOutsideContainer}>
        <div className="search-select__input-wrapper">
          <input
            ref={inputRef}
            type="text"
            className="search-select__input"
            placeholder={placeholder ?? 'Rechercher...'}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setIsOpen(true)
              setActiveIndex(-1)
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showDropdown}
            aria-controls={showDropdown ? listboxId : undefined}
            aria-activedescendant={
              activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
            }
            aria-label={ariaLabelledBy ? undefined : label}
            aria-labelledby={ariaLabelledBy}
          />
          {isOpen && <DismissButton onDismiss={dismiss} />}
        </div>

        {showDropdown && filtered.length > 0 && (
          <Listbox
            ref={dropdownRef}
            id={listboxId}
            label={label}
            filtered={filtered}
            activeIndex={activeIndex}
            onSelect={(opt) => {
              commitOption(opt)
              inputRef.current?.focus()
            }}
          />
        )}

        <DropdownStatus
          showDropdown={showDropdown}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => {
            optionsQuery.refetch()
          }}
          filteredCount={filtered.length}
          query={query}
          debouncedQuery={debouncedQuery}
          isOpen={isOpen}
          minChars={minChars}
          announcement={announcement}
        />
      </div>
    </div>
  )
}
