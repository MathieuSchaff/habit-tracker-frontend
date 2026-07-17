import { useCallback, useId, useRef, useState } from 'react'

import type { FilterOption } from '@/component/Filter/types'
import { useAnnouncement } from '@/component/Filter/useAnnouncement'
import { useClickOutside } from '@/hooks/useClickOutside'
import { useScrollActiveOptionIntoView } from '@/hooks/useScrollActiveOptionIntoView'
export function useSearchSelectController(onToggle: (value: string) => void) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [announcement, setAnnouncement] = useAnnouncement()
  const clickOutsideContainer = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()

  const dismiss = useCallback(() => {
    setIsOpen(false)
    setQuery('')
    setActiveIndex(-1)
    inputRef.current?.focus()
  }, [])

  const commitOption = useCallback(
    (opt: FilterOption) => {
      setAnnouncement(`${opt.label} ajouté`)
      onToggle(opt.value)
      setQuery('')
      setActiveIndex(-1)
    },
    [onToggle, setAnnouncement]
  )
  useClickOutside(clickOutsideContainer, () => {
    setIsOpen(false)
    setQuery('')
    setActiveIndex(-1)
  })

  useScrollActiveOptionIntoView(activeIndex, isOpen, listboxId)
  return {
    inputRef,
    commitOption,
    dismiss,
    dropdownRef,
    listboxId,
    query,
    setQuery,
    isOpen,
    setIsOpen,
    activeIndex,
    setActiveIndex,
    announcement,
    clickOutsideContainer,
  }
}
