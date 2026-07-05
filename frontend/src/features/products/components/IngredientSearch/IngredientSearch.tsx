import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import { Input } from '@/component/Input/Input'
import { ComboboxPrimitive } from '@/component/Search/ComboboxPrimitive'
import { useCombobox } from '@/component/Search/useCombobox'
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

  const combobox = useCombobox({
    items: available,
    onSelect: handleSelect,
    // Escape and outside click also clear the typed text.
    onClose: () => setQuery(''),
    // Surface any failed search even with no results (429 gets a specific message, else the default).
    canOpen: available.length > 0 || isError,
    isError,
  })

  function handleSelect(ing: { id: string; name: string }) {
    onAdd(ing.id, ing.name)
    setQuery('')
    combobox.close()
  }

  const rateLimitMsg = rateLimitMessage(error)

  return (
    <ComboboxPrimitive
      combobox={combobox}
      inputValue={query}
      errorMessage={rateLimitMsg ?? undefined}
      onRetry={() => {
        refetch()
      }}
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
            const val = e.target.value
            setQuery(val)
            if (val.length > 0) combobox.open()
            else combobox.close()
          }}
          autoComplete="off"
          aria-expanded={combobox.isOpen}
          aria-controls={combobox.isOpen ? listboxId : undefined}
          aria-activedescendant={activeDescendant}
          aria-autocomplete="list"
        />
      )}
    </ComboboxPrimitive>
  )
}
