import { type ReactNode, useEffect, useId, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'

import { useFlipPlacement } from './useFlipPlacement'
import './ComboboxPrimitive.css'

export interface ComboboxAriaProps {
  listboxId: string
  activeDescendant: string | undefined
}

// Grouped suggestion entries rendered below the main `items` list. Each entry
// is self-contained (own render + onSelect) so the Primitive stays agnostic
// about the section's domain (ingredients, brands, free-text fallback…).
export interface ComboboxSectionItem {
  id: string | number
  render: ReactNode
  onSelect: () => void
}

export interface ComboboxSection {
  id: string
  label: string
  items: ComboboxSectionItem[]
}

interface ComboboxPrimitiveProps<T> {
  items: T[]
  sections?: ComboboxSection[]
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
  sections,
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

  // Flat list of all interactive entries (main items + every section's items)
  // gives a single index space for keyboard navigation across the whole dropdown.
  const sectionEntries = useMemo(() => (sections ?? []).flatMap((s) => s.items), [sections])
  const totalEntries = items.length + sectionEntries.length

  // items.length is a deps trigger: dropdown height changes as results stream
  // in (async queries), and we want the flip recalculated when content shifts.
  useFlipPlacement(containerRef, dropdownRef, isOpen, [totalEntries])

  useEffect(() => {
    if (!isOpen) return
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      const inTrigger = containerRef.current?.contains(target)
      // Dropdown is portaled — also exempt clicks on it from "outside".
      const inDropdown = dropdownRef.current?.contains(target)
      if (!inTrigger && !inDropdown) {
        // Capture-phase intercept so an outside tap dismisses the dropdown
        // without firing the underlying link/button (common on mobile where
        // there's no Escape key — accidental navigation was the alternative).
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('click', handleClickOutside, true)
    return () => document.removeEventListener('click', handleClickOutside, true)
  }, [isOpen, onClose])

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
        setHighlightedIndex(highlightedIndex < totalEntries - 1 ? highlightedIndex + 1 : 0)
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(highlightedIndex > 0 ? highlightedIndex - 1 : totalEntries - 1)
        break
      case 'Enter':
        if (highlightedIndex >= 0) {
          // Sections first in index space (0..sectionEntries.length-1), then main items.
          // Section facets render above results, so keyboard order mirrors visual order.
          if (highlightedIndex < sectionEntries.length) {
            const sectionEntry = sectionEntries[highlightedIndex]
            if (sectionEntry) {
              e.preventDefault()
              sectionEntry.onSelect()
            }
          } else {
            const itemIdx = highlightedIndex - sectionEntries.length
            if (items[itemIdx]) {
              e.preventDefault()
              onSelect(items[itemIdx])
            }
          }
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

      {isOpen &&
        createPortal(
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
                  {sections?.map((section, sIdx) => {
                    // Each section's first global index = sum of prior section sizes.
                    // Sections precede main items in both render and keyboard order.
                    let baseIdx = 0
                    for (let i = 0; i < sIdx; i++) baseIdx += sections[i].items.length
                    const labelId = `${listboxId}-section-${section.id}`
                    return (
                      // biome-ignore lint/a11y/useSemanticElements: ARIA listbox group pattern needs role=group; <fieldset> is form-only
                      <div
                        key={section.id}
                        role="group"
                        aria-labelledby={labelId}
                        className="combobox-primitive__section"
                      >
                        <div id={labelId} className="combobox-primitive__section-label">
                          {section.label}
                        </div>
                        {section.items.map((entry, i) => {
                          const globalIdx = baseIdx + i
                          const isActive = globalIdx === highlightedIndex
                          return (
                            // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard nav handled on container
                            <div
                              key={entry.id}
                              id={`${listboxId}-option-${globalIdx}`}
                              role="option"
                              aria-selected={isActive}
                              className={`combobox-primitive__option ${isActive ? 'combobox-primitive__option--active' : ''}`}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => entry.onSelect()}
                              tabIndex={-1}
                            >
                              {entry.render}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                  {items.map((item, index) => {
                    const globalIdx = sectionEntries.length + index
                    const isActive = globalIdx === highlightedIndex
                    const key = keyExtractor ? keyExtractor(item, index) : index
                    return (
                      // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard nav handled on container
                      <div
                        key={key}
                        id={`${listboxId}-option-${globalIdx}`}
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
                  {totalEntries === 0 && !footer && inputValue.trim() !== '' && (
                    <output className="combobox-primitive__empty">{emptyMessage}</output>
                  )}
                </div>
                {footer && <div className="combobox-primitive__footer">{footer}</div>}
              </>
            )}
          </div>,
          document.body
        )}

      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {isOpen ? `${totalEntries} résultats disponibles. Utilisez les flèches pour naviguer.` : ''}
      </span>
    </div>
  )
}
