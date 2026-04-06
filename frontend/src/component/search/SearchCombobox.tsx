import { type QueryKey, type UseQueryOptions, useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'

import { ComboboxPrimitive } from './ComboboxPrimitive'
import './SearchCombobox.css'

export interface SearchComboboxResult {
  id: number | string
  slug: string
  label: string
  sublabel?: string
}

interface SearchComboboxProps<TItem, TQueryKey extends QueryKey> {
  queryFn: (query: string) => UseQueryOptions<TItem[], Error, TItem[], TQueryKey>
  // NoInfer prevents TypeScript from trying to infer TItem from toResult,
  // forcing it to rely solely on queryFn for the source of truth.
  toResult: (item: NoInfer<TItem>) => SearchComboboxResult
  onSelect: (slug: string, result: SearchComboboxResult) => void
  placeholder?: string
  label: string
  minChars?: number
  debounce?: number
}

export function SearchCombobox<TItem, TQueryKey extends QueryKey>({
  queryFn,
  toResult,
  onSelect,
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

  const { data: rawResults = [], isFetching } = useQuery({
    ...queryFn(debouncedQuery),
    enabled: debouncedQuery.length >= minChars,
  })

  const results = rawResults.map(toResult)

  function handleSelect(result: SearchComboboxResult) {
    setQuery('')
    setIsOpen(false)
    setHighlightedIndex(-1)
    onSelect(result.slug, result)
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
      isLoading={isFetching}
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
