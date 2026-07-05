import { type RefObject, useCallback } from 'react'

import type { FilterOption } from '../types'

type Args = {
  isOpen: boolean
  setIsOpen: (v: boolean) => void
  activeIndex: number
  setActiveIndex: (next: number | ((prev: number) => number)) => void
  filtered: FilterOption[]
  inputRef: RefObject<HTMLInputElement | null>
  onSelect: (opt: FilterOption) => void
}

export function useComboboxKeyboard({
  isOpen,
  setIsOpen,
  activeIndex,
  setActiveIndex,
  filtered,
  inputRef,
  onSelect,
}: Args) {
  return useCallback(
    (e: React.KeyboardEvent) => {
      // Enter while composing (IME, predictive keyboards) only commits the composition;
      // it must never toggle an option nor reset the query.
      if (e.key === 'Enter' && (e.nativeEvent.isComposing || e.keyCode === 229)) return
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          if (!isOpen) {
            setIsOpen(true)
            setActiveIndex(0)
          } else {
            setActiveIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : prev))
          }
          break
        case 'ArrowUp':
          e.preventDefault()
          setActiveIndex(activeIndex > 0 ? activeIndex - 1 : -1)
          if (activeIndex === 0) inputRef.current?.focus()
          break
        case 'Enter':
          e.preventDefault()
          if (isOpen && activeIndex >= 0 && filtered[activeIndex]) {
            onSelect(filtered[activeIndex])
          } else {
            setIsOpen(true)
          }
          break
        case 'Escape':
          if (isOpen) {
            e.preventDefault()
            e.stopPropagation()
            setIsOpen(false)
            setActiveIndex(-1)
            inputRef.current?.focus()
          }
          break
        case 'Tab':
          setIsOpen(false)
          setActiveIndex(-1)
          break
      }
    },
    [isOpen, activeIndex, filtered, setIsOpen, setActiveIndex, inputRef, onSelect]
  )
}
