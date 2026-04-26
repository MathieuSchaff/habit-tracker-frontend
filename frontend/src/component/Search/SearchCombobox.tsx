import {
  type InfiniteData,
  type QueryKey,
  type UseInfiniteQueryOptions,
  useInfiniteQuery,
} from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'

import { ComboboxPrimitive } from './ComboboxPrimitive'
import './SearchCombobox.css'

export interface SearchComboboxResult {
  id: number | string
  slug: string
  label: string
  sublabel?: string
}

export interface SearchComboboxExtraEntry {
  id: string
  label: string
  icon?: ReactNode
  onSelect: () => void
}

// Pages are uniform across consumers; backends without real pagination wrap
// their single-page response as { items, hasMore: false, nextOffset: 0 }.
export interface SearchPage<TItem> {
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
  // NoInfer keeps inference anchored to queryFn — TItem flows from there.
  toResult: (item: NoInfer<TItem>) => SearchComboboxResult
  onSelect: (slug: string, result: SearchComboboxResult) => void
  // Optional shortcut entries rendered at the bottom of the dropdown.
  // Use case: "see all results for X" when query matches a known facet (brand, etc.).
  extraEntries?: (debouncedQuery: string) => SearchComboboxExtraEntry[]
  placeholder?: string
  label: string
  minChars?: number
  debounce?: number
}

export function SearchCombobox<TItem, TQueryKey extends QueryKey>({
  queryFn,
  toResult,
  onSelect,
  extraEntries,
  placeholder = 'Rechercher...',
  label,
  minChars = 2,
  debounce = 300,
}: SearchComboboxProps<TItem, TQueryKey>) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), debounce)
    return () => clearTimeout(timer)
  }, [query, debounce])

  const { data, isFetching, hasNextPage, fetchNextPage, isFetchingNextPage } = useInfiniteQuery({
    ...queryFn(debouncedQuery),
    enabled: debouncedQuery.length >= minChars,
  })

  const rawResults = data?.pages.flatMap((p) => p.items) ?? []
  const results = rawResults.map(toResult)

  function handleSelect(result: SearchComboboxResult) {
    setQuery('')
    setIsOpen(false)
    setHighlightedIndex(-1)
    onSelect(result.slug, result)
  }

  const extras = extraEntries?.(debouncedQuery) ?? []

  function handleExtraSelect(entry: SearchComboboxExtraEntry) {
    setQuery('')
    setIsOpen(false)
    setHighlightedIndex(-1)
    entry.onSelect()
  }

  const showDropdown = isOpen && debouncedQuery.length >= minChars

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      setIsOpen(false)
      setHighlightedIndex(-1)
    }
  }

  return (
    <ComboboxPrimitive
      items={results}
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
      isLoading={isFetching && !isFetchingNextPage}
      isLoadingMore={isFetchingNextPage}
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
      footer={
        extras.length > 0
          ? extras.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className="search-combobox__extra"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleExtraSelect(entry)}
              >
                {entry.icon}
                <span>{entry.label}</span>
              </button>
            ))
          : null
      }
    >
      {({ listboxId, activeDescendant }) => (
        <div className="search-combobox__input-wrap">
          <Search size={15} className="search-combobox__icon" aria-hidden="true" />
          <input
            type="text"
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
        </div>
      )}
    </ComboboxPrimitive>
  )
}
