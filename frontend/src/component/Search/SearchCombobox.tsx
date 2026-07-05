import {
  type InfiniteData,
  type QueryKey,
  type UseInfiniteQueryOptions,
  useInfiniteQuery,
} from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { useId, useRef, useState } from 'react'

import { useDebounce } from '@/hooks/useDebounce'
import { rateLimitMessage } from '@/lib/helpers/apiError'
import {
  ComboboxPrimitive,
  type ComboboxSection,
  type ComboboxSectionItem,
} from './ComboboxPrimitive'
import { useCombobox } from './useCombobox'
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
  /** Intent signal: fires when the input gains focus (e.g. to defer-load facet data). */
  onFocus?: () => void
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
  onFocus,
  placeholder = 'Rechercher...',
  label,
  minChars = 2,
  debounce = 300,
}: SearchComboboxProps<TItem, TQueryKey>) {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, debounce)
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()

  const {
    data,
    isFetching,
    isPlaceholderData,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isError,
    error,
    refetch,
  } = useInfiniteQuery({
    ...queryFn(debouncedQuery),
    enabled: debouncedQuery.length >= minChars,
    placeholderData: (prev) => prev,
  })

  const rawResults = data?.pages.flatMap((p) => p.items) ?? []
  const results = rawResults.map(toResult)

  const visibleSections = (sections?.(debouncedQuery) ?? [])
    .filter((s) => s.items.length > 0)
    .map((s) => ({
      ...s,
      items: s.items.map((item) => ({
        ...item,
        onSelect: () => handleSectionSelect(item),
      })),
    }))

  const combobox = useCombobox({
    items: results,
    sections: visibleSections,
    onSelect: handleSelect,
    onKeyDown: handleKeyDown,
    canOpen: debouncedQuery.length >= minChars,
    isLoading: isFetching && !isFetchingNextPage && !isPlaceholderData,
    isError,
  })

  function clearAndClose() {
    setQuery('')
    combobox.close()
  }

  function handleSelect(result: SearchComboboxResult) {
    clearAndClose()
    onSelect(result.slug, result)
  }

  function handleSectionSelect(entry: ComboboxSectionItem) {
    clearAndClose()
    entry.onSelect()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Tab') {
      combobox.close()
    }
    // Gate and submit on the live query, not the debounced one: Enter right after the
    // last keystroke must not silently no-op nor navigate to a stale q.
    // openIntent, not isOpen: the canOpen gate lags behind on the debounced query.
    if (
      e.key === 'Enter' &&
      combobox.highlightedIndex === -1 &&
      combobox.openIntent &&
      onSubmitQuery
    ) {
      const live = query.trim()
      if (live.length < minChars) return
      e.preventDefault()
      onSubmitQuery(live)
      clearAndClose()
    }
  }

  return (
    <ComboboxPrimitive
      combobox={combobox}
      inputValue={debouncedQuery}
      isUpdating={isFetching && isPlaceholderData}
      isLoadingMore={isFetchingNextPage}
      errorMessage={rateLimitMessage(error) ?? undefined}
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
            role="combobox"
            className="search-combobox__input"
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              combobox.open()
            }}
            onFocus={() => {
              onFocus?.()
              if (query.length >= minChars) combobox.open()
            }}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-label={label}
            aria-expanded={combobox.isOpen}
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
