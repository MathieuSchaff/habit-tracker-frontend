import { type ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { useCaptureDismiss } from '@/hooks/useCaptureDismiss'
import { useFlipPlacement } from '@/hooks/useFlipPlacement'
import './ComboboxPrimitive.css'

interface ComboboxAriaProps {
  listboxId: string
  activeDescendant: string | undefined
}

// Self-contained section entries (own render + onSelect) so the Primitive stays domain-agnostic.
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
  isError?: boolean
  onRetry?: () => void
  errorMessage?: string
  emptyMessage?: string
  keyExtractor: (item: T, index: number) => string | number
  footer?: ReactNode
  /** Infinite scroll: sentinel intersection triggers onLoadMore. */
  hasMore?: boolean
  onLoadMore?: () => void
  isLoadingMore?: boolean
  children: (ariaProps: ComboboxAriaProps) => ReactNode
}

// Follows the WAI-ARIA Combobox (Listbox) pattern.
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
  isError,
  onRetry,
  errorMessage = 'Erreur de recherche',
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

  // <dialog> opened with showModal() lives in the browser top-layer, which renders above all
  // regular stacking contexts regardless of z-index — even portals on document.body.
  // Portaling into the dialog element itself keeps the dropdown in the same top-layer.
  // Init to document.body so the portal renders on first pass; effect upgrades to dialog if present.
  const [portalTarget, setPortalTarget] = useState<Element>(() => document.body)
  useEffect(() => {
    const dialog = containerRef.current?.closest('dialog')
    if (dialog) setPortalTarget(dialog)
  }, [])

  // Flat index space across sections + main items for keyboard nav.
  const sectionEntries = useMemo(() => (sections ?? []).flatMap((s) => s.items), [sections])
  const totalEntries = items.length + sectionEntries.length

  // totalEntries in deps so flip recalculates as async results stream in.
  useFlipPlacement(containerRef, dropdownRef, isOpen, [totalEntries])

  // useCaptureDismiss (not useClickOutside) because the dropdown is portaled
  // over real click targets - see hook docs for the tap-block rationale.
  // Multi-ref: both the trigger container and the portaled dropdown count as "inside".
  useCaptureDismiss([containerRef, dropdownRef], onClose, { enabled: isOpen })

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
    // Parent runs first so it can intercept e.g. Tab.
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
          // Sections occupy indices 0..sectionEntries.length-1; main items follow. Mirrors visual order.
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
            {isError ? (
              <div className="combobox-primitive__error" role="alert">
                <span>{errorMessage}</span>
                {onRetry && (
                  <button type="button" className="combobox-primitive__retry" onClick={onRetry}>
                    Réessayer
                  </button>
                )}
              </div>
            ) : isLoading ? (
              <output className="combobox-primitive__status">Chargement…</output>
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
                    // First global index of this section = sum of prior section sizes.
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
                    const key = keyExtractor(item, index)
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
                        <output className="combobox-primitive__status">Chargement…</output>
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
          portalTarget
        )}

      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {isOpen
          ? isError
            ? errorMessage
            : `${totalEntries} résultats disponibles. Utilisez les flèches pour naviguer.`
          : ''}
      </span>
    </div>
  )
}
