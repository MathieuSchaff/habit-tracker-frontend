import { type ReactNode, useCallback, useState } from 'react'

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

interface UseComboboxArgs<T> {
  items: T[]
  /** Grouped entries rendered above items; they come first in the flat keyboard index. */
  sections?: ComboboxSection[]
  onSelect: (item: T) => void
  /** Runs when the combobox closes itself (Escape, outside click). */
  onClose?: () => void
  /** Parent handler runs before the internal switch; preventDefault() short-circuits it. */
  onKeyDown?: (e: React.KeyboardEvent) => void
  /** Gate ANDed with the open intent (min chars reached, has matches...). */
  canOpen?: boolean
  isLoading?: boolean
  isError?: boolean
}

export interface ComboboxController<T> {
  items: T[]
  sections: ComboboxSection[] | undefined
  sectionEntries: ComboboxSectionItem[]
  totalEntries: number
  isOpen: boolean
  /** Open intent before the canOpen gate. SearchCombobox reads it to submit on Enter while the debounced gate is still stale. */
  openIntent: boolean
  isLoading: boolean | undefined
  isError: boolean | undefined
  /** Options exist in the DOM only outside loading/error; gates arrow nav and aria-activedescendant. */
  listboxRendered: boolean
  highlightedIndex: number
  setHighlightedIndex: (index: number) => void
  /** Opens and resets the highlight; safe to call on every keystroke. */
  open: () => void
  close: () => void
  /** close() then onClose. For self-initiated closes (Escape, outside click). */
  dismiss: () => void
  onSelect: (item: T) => void
  handleKeyDown: (e: React.KeyboardEvent) => void
}

export function useCombobox<T>({
  items,
  sections,
  onSelect,
  onClose,
  onKeyDown,
  canOpen = true,
  isLoading,
  isError,
}: UseComboboxArgs<T>): ComboboxController<T> {
  const [openIntent, setOpenIntent] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  const isOpen = openIntent && canOpen
  // Flat index space across sections + main items for keyboard nav.
  const sectionEntries = (sections ?? []).flatMap((s) => s.items)
  const totalEntries = items.length + sectionEntries.length
  // Arrow nav while options are not in the DOM would point aria-activedescendant at a missing id.
  const listboxRendered = !isLoading && !isError

  const open = useCallback(() => {
    setOpenIntent(true)
    setHighlightedIndex(-1)
  }, [])
  const close = useCallback(() => {
    setOpenIntent(false)
    setHighlightedIndex(-1)
  }, [])
  const dismiss = () => {
    close()
    onClose?.()
  }

  const selectHighlighted = (e: React.KeyboardEvent) => {
    if (highlightedIndex < 0) return
    // Sections occupy indices 0..sectionEntries.length-1; main items follow.
    if (highlightedIndex < sectionEntries.length) {
      const sectionEntry = sectionEntries[highlightedIndex]
      if (!sectionEntry) return
      e.preventDefault()
      sectionEntry.onSelect()
      return
    }
    const item = items[highlightedIndex - sectionEntries.length]
    if (!item) return
    e.preventDefault()
    onSelect(item)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter while composing (IME, predictive keyboards) only commits the composition;
    // it must never select an option nor reach the parent's submit handler.
    if (e.key === 'Enter' && (e.nativeEvent.isComposing || e.keyCode === 229)) return
    // Parent runs first so it can intercept Tab.
    onKeyDown?.(e)
    if (e.defaultPrevented) return

    if (!isOpen) return

    if (!listboxRendered) {
      if (e.key === 'Escape') {
        e.preventDefault()
        // Consumed Escape stays here: document-level useEscapeKey listeners ignore defaultPrevented.
        e.stopPropagation()
        dismiss()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        if (totalEntries === 0) break
        e.preventDefault()
        setHighlightedIndex(highlightedIndex < totalEntries - 1 ? highlightedIndex + 1 : 0)
        break
      case 'ArrowUp':
        if (totalEntries === 0) break
        e.preventDefault()
        setHighlightedIndex(highlightedIndex > 0 ? highlightedIndex - 1 : totalEntries - 1)
        break
      case 'Enter':
        selectHighlighted(e)
        break
      case 'Escape':
        e.preventDefault()
        e.stopPropagation()
        dismiss()
        break
    }
  }

  return {
    items,
    sections,
    sectionEntries,
    totalEntries,
    isOpen,
    openIntent,
    isLoading,
    isError,
    listboxRendered,
    highlightedIndex,
    setHighlightedIndex,
    open,
    close,
    dismiss,
    onSelect,
    handleKeyDown,
  }
}
