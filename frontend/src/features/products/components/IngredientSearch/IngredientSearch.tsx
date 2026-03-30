import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

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
  const listboxId = 'ingredient-search-listbox'

  const available = results?.filter((r) => !existingIds.includes(r.id)) ?? []

  function handleSelect(ing: { id: string; name: string }) {
    onAdd(ing.id, ing.name)
    setQuery('')
    setHighlightedIndex(-1)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (available.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev < available.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : available.length - 1))
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < available.length) {
        e.preventDefault()
        handleSelect(available[highlightedIndex])
      } else if (available.length > 0) {
        e.preventDefault()
        handleSelect(available[0])
      }
    } else if (e.key === 'Escape') {
      setHighlightedIndex(-1)
      setQuery('')
    }
  }

  const isOpen = query.length > 0 && available.length > 0
  const activeDescendant =
    highlightedIndex >= 0 ? `${listboxId}-option-${highlightedIndex}` : undefined

  return (
    <div className="ingredient-search">
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
        onKeyDown={handleKeyDown}
        autoComplete="off"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={activeDescendant}
        aria-autocomplete="list"
      />
      {isOpen && (
        <div id={listboxId} role="listbox" className="ingredient-search__results">
          {available.map((ing, index) => (
            // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard nav handled on the input per WAI-ARIA combobox pattern
            <div
              key={ing.id}
              id={`${listboxId}-option-${index}`}
              role="option"
              tabIndex={-1}
              aria-selected={index === highlightedIndex}
              className={`ingredient-search__result${index === highlightedIndex ? ' ingredient-search__result--highlighted' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(ing)}
            >
              <span className="ingredient-search__result-name">{ing.name}</span>
              {ing.category && (
                <span className="ingredient-search__result-category">{ing.category}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
