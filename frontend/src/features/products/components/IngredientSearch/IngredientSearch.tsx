import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import { Input } from '@/component/Input/Input'
import { ComboboxPrimitive } from '@/component/Search/ComboboxPrimitive'
import { useDebounce } from '@/hooks/useDebounce'
import { rateLimitMessage } from '@/lib/helpers/apiError'
import { ingredientQueries } from '@/lib/queries/ingredients'
import './IngredientSearch.css'

type IngredientSearchProps = {
  existingIds: string[]
  onAdd: (ingredientId: string, ingredientName: string) => void
}

export function IngredientSearch({ existingIds, onAdd }: IngredientSearchProps) {
  const [query, setQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const debouncedQuery = useDebounce(query, 200)
  const {
    data: results,
    error,
    refetch,
    isError,
  } = useQuery(ingredientQueries.search(debouncedQuery))

  const available = useMemo(() => {
    if (!results) return []
    const taken = new Set(existingIds)
    return results.filter((r) => !taken.has(r.id))
  }, [results, existingIds])

  function handleSelect(ing: { id: string; name: string }) {
    onAdd(ing.id, ing.name)
    setQuery('')
    setHighlightedIndex(-1)
  }

  // Surface any failed search even with no results (429 gets a specific message, else the default).
  const rateLimitMsg = rateLimitMessage(error)
  const isOpen = query.length > 0 && (available.length > 0 || isError)

  return (
    <ComboboxPrimitive
      items={available}
      isOpen={isOpen}
      isError={isError}
      errorMessage={rateLimitMsg ?? undefined}
      onRetry={() => {
        refetch()
      }}
      onClose={() => {
        setQuery('')
        setHighlightedIndex(-1)
      }}
      onSelect={handleSelect}
      highlightedIndex={highlightedIndex}
      setHighlightedIndex={setHighlightedIndex}
      inputValue={query}
      keyExtractor={(item) => item.id}
      renderItem={(item) => (
        <>
          <span className="ingredient-search__result-name">{item.name}</span>
          {item.category && (
            <span className="ingredient-search__result-category">{item.category}</span>
          )}
        </>
      )}
    >
      {({ listboxId, activeDescendant }) => (
        <Input
          type="text"
          role="combobox"
          placeholder="Rechercher un ingrédient à ajouter…"
          aria-label="Rechercher un ingrédient"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setHighlightedIndex(-1)
          }}
          autoComplete="off"
          aria-expanded={isOpen}
          aria-controls={isOpen ? listboxId : undefined}
          aria-activedescendant={activeDescendant}
          aria-autocomplete="list"
        />
      )}
    </ComboboxPrimitive>
  )
}
