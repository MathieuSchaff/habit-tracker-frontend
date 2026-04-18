import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { ComboboxPrimitive } from '../../../../component/Search/ComboboxPrimitive'
import { ingredientQueries } from '../../../../lib/queries/ingredients'
import './IngredientSearch.css'

type IngredientSearchProps = {
  existingIds: string[]
  onAdd: (ingredientId: string, ingredientName: string) => void
}

export function IngredientSearch({ existingIds, onAdd }: IngredientSearchProps) {
  const [query, setQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const { data: results } = useQuery(ingredientQueries.search(query))

  const available = results?.filter((r) => !existingIds.includes(r.id)) ?? []

  function handleSelect(ing: { id: string; name: string }) {
    onAdd(ing.id, ing.name)
    setQuery('')
    setHighlightedIndex(-1)
  }

  const isOpen = query.length > 0 && available.length > 0

  return (
    <ComboboxPrimitive
      items={available}
      isOpen={isOpen}
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
        <input
          type="text"
          role="combobox"
          className="ingredient-search__input"
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
