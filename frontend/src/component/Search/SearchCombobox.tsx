import {
  type InfiniteData,
  type QueryKey,
  type UseInfiniteQueryOptions,
  useInfiniteQuery,
} from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { useId, useRef, useState } from 'react'

import { useDebounce } from '@/hooks/useDebounce'
import {
  ComboboxPrimitive,
  type ComboboxSection,
  type ComboboxSectionItem,
} from './ComboboxPrimitive'
import './SearchCombobox.css'

export interface SearchComboboxResult {
  id: number | string
  slug: string
  label: string
  sublabel?: string
}

// Backends without pagination wrap their response as { items, hasMore: false, nextOffset: 0 }.
interface SearchPage<TItem> {
  items: TItem[]
  hasMore: boolean
  nextOffset: number
}

interface SearchComboboxProps<TItem, TQueryKey extends QueryKey> {
  queryFn: (
    query: string
  ) => UseInfiniteQueryOptions<
    SearchPage<TItem>,
    Error,
    InfiniteData<SearchPage<TItem>, unknown>,
    TQueryKey,
    number
  >
  // NoInfer keeps TItem anchored to queryFn.
  toResult: (item: NoInfer<TItem>) => SearchComboboxResult
  onSelect: (slug: string, result: SearchComboboxResult) => void
  /** Grouped facets/shortcuts above results. Empty sections are filtered out. */
  sections?: (debouncedQuery: string) => ComboboxSection[]
  /** Fired on Enter when no item is highlighted; applies typed text as a free-text filter. */
  onSubmitQuery?: (query: string) => void
  placeholder?: string
  label: string
  minChars?: number
  debounce?: number
}

export function SearchCombobox<TItem, TQueryKey extends QueryKey>({
  queryFn,
  toResult,
  onSelect,
  sections,
  onSubmitQuery,
  placeholder = 'Rechercher...',
  label,
  minChars = 2,
  debounce = 300,
}: SearchComboboxProps<TItem, TQueryKey>) {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, debounce)
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()

  function clearAndClose() {
    setQuery('')
    setIsOpen(false)
    setHighlightedIndex(-1)
  }

  const {
    data,
    isFetching,
    isPlaceholderData,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isError,
    refetch,
  } = useInfiniteQuery({
    ...queryFn(debouncedQuery),
    enabled: debouncedQuery.length >= minChars,
    placeholderData: (prev) => prev,
  })

  const rawResults = data?.pages.flatMap((p) => p.items) ?? []
  const results = rawResults.map(toResult)

  function handleSelect(result: SearchComboboxResult) {
    setQuery('')
    setIsOpen(false)
    setHighlightedIndex(-1)
    onSelect(result.slug, result)
  }

  function handleSectionSelect(entry: ComboboxSectionItem) {
    setQuery('')
    setIsOpen(false)
    setHighlightedIndex(-1)
    entry.onSelect()
  }

  const visibleSections = (sections?.(debouncedQuery) ?? [])
    .filter((s) => s.items.length > 0)
    .map((s) => ({
      ...s,
      items: s.items.map((item) => ({
        ...item,
        onSelect: () => handleSectionSelect(item),
      })),
    }))

  const showDropdown = isOpen && debouncedQuery.length >= minChars

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      setIsOpen(false)
      setHighlightedIndex(-1)
    }
    if (e.key === 'Enter' && highlightedIndex === -1 && showDropdown && onSubmitQuery) {
      e.preventDefault()
      onSubmitQuery(debouncedQuery)
      clearAndClose()
    }
  }

  return (
    <ComboboxPrimitive
      items={results}
      sections={visibleSections}
      isOpen={showDropdown}
      onClose={() => {
        setIsOpen(false)
        setHighlightedIndex(-1)
      }}
      onSelect={handleSelect}
      highlightedIndex={highlightedIndex}
      setHighlightedIndex={setHighlightedIndex}
      inputValue={debouncedQuery}
      onKeyDown={handleKeyDown}
      isLoading={isFetching && !isFetchingNextPage && !isPlaceholderData}
      isLoadingMore={isFetchingNextPage}
      isError={isError}
      onRetry={() => {
        refetch()
      }}
      hasMore={!!hasNextPage}
      onLoadMore={() => {
        if (hasNextPage && !isFetchingNextPage) fetchNextPage()
      }}
      keyExtractor={(item) => item.id}
      renderItem={(item) => (
        <>
          <span className="search-combobox__label">{item.label}</span>
          {item.sublabel && <span className="search-combobox__sublabel">{item.sublabel}</span>}
        </>
      )}
    >
      {({ listboxId, activeDescendant }) => (
        <div className="search-combobox__input-wrap">
          <Search size={15} className="search-combobox__icon" aria-hidden="true" />
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            // react-doctor-disable-next-line react-doctor/no-redundant-roles
            role="combobox"
            className="search-combobox__input"
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setIsOpen(true)
              setHighlightedIndex(-1)
            }}
            onFocus={() => query.length >= minChars && setIsOpen(true)}
            autoComplete="off"
            aria-label={label}
            aria-expanded={showDropdown}
            aria-controls={listboxId}
            aria-activedescendant={activeDescendant}
            aria-autocomplete="list"
          />
          {query.length > 0 && (
            <button
              type="button"
              className="search-combobox__clear"
              onClick={() => {
                clearAndClose()
                inputRef.current?.focus()
              }}
              aria-label="Effacer la recherche"
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </ComboboxPrimitive>
  )
}
