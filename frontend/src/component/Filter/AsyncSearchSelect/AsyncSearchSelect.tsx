import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { useDebounce } from '@/hooks/useDebounce'
import { useFlipPlacement } from '@/hooks/useFlipPlacement'
import { rateLimitMessage } from '@/lib/helpers/apiError'
import { ComboboxTextInput } from '../ComboboxTextInput'
import type { AsyncSearchQueryFactory, FilterOption } from '../types'
import { useSearchSelectController } from '../useSearchSelectController'
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
  // Loosely typed at the prop level - the type union of all possible factories
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

// Options come from a remote search; used when the list is too large to ship to the client.
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
  const {
    query,
    setQuery,
    isOpen,
    setIsOpen,
    activeIndex,
    setActiveIndex,
    inputRef,
    dropdownRef,
    listboxId,
    clickOutsideContainer,
    announcement,
    dismiss,
    commitOption,
  } = useSearchSelectController(onToggle)

  const debouncedQuery = useDebounce(query, debounce)

  const optionsQuery = useQuery({
    ...loadOptionsQuery(debouncedQuery),
    enabled: debouncedQuery.length >= minChars,
  })

  // Batch rapid chip toggles into a single fetch; useLabelCache slug fallback renders immediately.
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
  const errorMessage = rateLimitMessage(optionsQuery.error) ?? undefined

  const handleKeyDown = useComboboxKeyboard({
    isOpen,
    setIsOpen,
    activeIndex,
    setActiveIndex,
    filtered,
    inputRef,
    onSelect: commitOption,
  })

  // filtered.length in deps: listbox mounts one render after showDropdown (async query);
  // without it, dropdownRef is null on first run and flip coords stay empty.
  useFlipPlacement(
    clickOutsideContainer,
    dropdownRef,
    showDropdown,
    [filtered.length],
    '.filter-drawer__body'
  )

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
            expanded={showDropdown}
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
          errorMessage={errorMessage}
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
