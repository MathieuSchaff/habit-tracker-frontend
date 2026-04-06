import { type ReactNode, useEffect, useId, useRef } from 'react'
import './ComboboxPrimitive.css'

export interface ComboboxAriaProps {
  listboxId: string
  activeDescendant: string | undefined
}

interface ComboboxPrimitiveProps<T> {
  items: T[]
  isOpen: boolean
  onClose: () => void
  onSelect: (item: T) => void
  renderItem: (item: T, index: number, isActive: boolean) => ReactNode
  highlightedIndex: number
  setHighlightedIndex: (index: number) => void
  inputValue: string
  onKeyDown?: (e: React.KeyboardEvent) => void
  isLoading?: boolean
  emptyMessage?: string
  keyExtractor?: (item: T, index: number) => string | number
  children: (ariaProps: ComboboxAriaProps) => ReactNode
}

// follows the WAI-ARIA Combobox pattern (Listbox version) for keyboard navigation and accessibility
export function ComboboxPrimitive<T>({
  items,
  isOpen,
  onClose,
  onSelect,
  renderItem,
  highlightedIndex,
  setHighlightedIndex,
  inputValue,
  onKeyDown,
  isLoading,
  emptyMessage = 'Aucun résultat',
  keyExtractor,
  children,
}: ComboboxPrimitiveProps<T>) {
  const listboxId = useId()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  useEffect(() => {
    if (highlightedIndex >= 0 && isOpen) {
      const element = document.getElementById(`${listboxId}-option-${highlightedIndex}`)
      element?.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightedIndex, isOpen, listboxId])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // let the parent handle its own keys first, so it can intercept things like Tab before we do
    onKeyDown?.(e)
    if (e.defaultPrevented) return

    if (!isOpen) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(highlightedIndex < items.length - 1 ? highlightedIndex + 1 : 0)
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(highlightedIndex > 0 ? highlightedIndex - 1 : items.length - 1)
        break
      case 'Enter':
        if (highlightedIndex >= 0 && items[highlightedIndex]) {
          e.preventDefault()
          onSelect(items[highlightedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        onClose()
        break
    }
  }

  const activeDescendant =
    highlightedIndex >= 0 ? `${listboxId}-option-${highlightedIndex}` : undefined

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: wrapper for input navigation
    <div className="combobox-primitive" ref={containerRef} onKeyDown={handleKeyDown}>
      {children({ listboxId, activeDescendant })}

      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          className="combobox-primitive__dropdown"
          aria-label="Suggestions"
        >
          {isLoading ? (
            <output className="combobox-primitive__status">Chargement...</output>
          ) : items.length === 0 ? (
            inputValue.trim() !== '' && (
              <output className="combobox-primitive__empty">{emptyMessage}</output>
            )
          ) : (
            items.map((item, index) => {
              const isActive = index === highlightedIndex
              const key = keyExtractor ? keyExtractor(item, index) : index
              return (
                // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard nav handled on container
                <div
                  key={key}
                  id={`${listboxId}-option-${index}`}
                  role="option"
                  aria-selected={isActive}
                  className={`combobox-primitive__option ${isActive ? 'combobox-primitive__option--active' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onSelect(item)}
                  tabIndex={-1}
                >
                  {renderItem(item, index, isActive)}
                </div>
              )
            })
          )}
        </div>
      )}

      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {isOpen ? `${items.length} résultats disponibles. Utilisez les flèches pour naviguer.` : ''}
      </span>
    </div>
  )
}
