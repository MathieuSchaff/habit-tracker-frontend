import { type ReactNode, useEffect, useId, useRef } from 'react'

import { useFlipPlacement } from './useFlipPlacement'
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
  footer?: ReactNode
  // Infinite scroll: when hasMore is true and the sentinel intersects the dropdown
  // viewport, onLoadMore is invoked. isLoadingMore renders a "loading more" status.
  hasMore?: boolean
  onLoadMore?: () => void
  isLoadingMore?: boolean
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
  footer,
  hasMore,
  onLoadMore,
  isLoadingMore,
  children,
}: ComboboxPrimitiveProps<T>) {
  const listboxId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const itemsRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // items.length is a deps trigger: dropdown height changes as results stream
  // in (async queries), and we want the flip recalculated when content shifts.
  useFlipPlacement(containerRef, dropdownRef, isOpen, [items.length])

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

  useEffect(() => {
    if (!isOpen || !hasMore || !onLoadMore) return
    const sentinel = sentinelRef.current
    const root = itemsRef.current
    if (!sentinel || !root) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            onLoadMore()
          }
        }
      },
      { root, rootMargin: '40px', threshold: 0 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [isOpen, hasMore, onLoadMore])

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
        <div ref={dropdownRef} className="combobox-primitive__dropdown">
          {isLoading ? (
            <output className="combobox-primitive__status">Chargement...</output>
          ) : (
            <>
              <div
                id={listboxId}
                ref={itemsRef}
                role="listbox"
                className="combobox-primitive__items"
                aria-label="Suggestions"
              >
                {items.map((item, index) => {
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
                })}
                {items.length === 0 && !footer && inputValue.trim() !== '' && (
                  <output className="combobox-primitive__empty">{emptyMessage}</output>
                )}
                {hasMore && (
                  <div
                    ref={sentinelRef}
                    className="combobox-primitive__sentinel"
                    aria-hidden="true"
                  >
                    {isLoadingMore && (
                      <output className="combobox-primitive__status">Chargement...</output>
                    )}
                  </div>
                )}
              </div>
              {footer && <div className="combobox-primitive__footer">{footer}</div>}
            </>
          )}
        </div>
      )}

      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {isOpen ? `${items.length} résultats disponibles. Utilisez les flèches pour naviguer.` : ''}
      </span>
    </div>
  )
}
