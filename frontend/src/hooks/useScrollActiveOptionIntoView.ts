import { useEffect } from 'react'

/** Keeps the active listbox option (`${listboxId}-option-${index}`) in view during keyboard nav. */
export function useScrollActiveOptionIntoView(
  activeIndex: number,
  isOpen: boolean,
  listboxId: string
) {
  useEffect(() => {
    if (activeIndex >= 0 && isOpen) {
      const element = document.getElementById(`${listboxId}-option-${activeIndex}`)
      element?.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex, isOpen, listboxId])
}
