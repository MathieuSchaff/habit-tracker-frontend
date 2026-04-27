import {
  type InfiniteData,
  type QueryKey,
  type UseInfiniteQueryOptions,
  useInfiniteQuery,
} from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'

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
  // Optional grouped suggestions rendered below the main results list.
  // Each section has a header label and self-contained items (own onSelect).
  // Use cases: "see all products with X" facet shortcuts, "see all results
  // for X" free-text fallback. Empty sections are filtered out before render.
  sections?: (debouncedQuery: string) => ComboboxSection[]
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

  const { data, isFetching, isPlaceholderData, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useInfiniteQuery({
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

  // Drop sections with no matches — avoids orphan headers in the dropdown.
  // Wrap each item's onSelect to clear input and close dropdown after selection;
  // the caller's onSelect (e.g. navigate) only handles navigation, not UI cleanup.
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
    if (e.key === 'Enter' && highlightedIndex === -1 && showDropdown) {
      // Enter with no item highlighted: trigger the first visible section entry.
      // Sections are ordered by specificity — ingredients first, brands second,
      // free-text fallback last. Example: typing "vita" with an ingredient match
      // navigates to ?ingredient=vitamine-c, not ?q=vita.
      // Does nothing when no sections match.
      const firstEntry = visibleSections[0]?.items[0]
      if (firstEntry) {
        e.preventDefault()
        firstEntry.onSelect()
      }
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
