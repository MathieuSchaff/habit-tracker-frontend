import { type RefObject, useEffect } from 'react'

const GAP = 4

/**
 * Positions a fixed-element dropdown under (or above) a trigger; flips when
 * space below is insufficient. Listens for window resize and, when a
 * `scrollableSelector` is provided, the closest matching scrollable ancestor.
 */
export function useFlipPlacement(
  triggerRef: RefObject<HTMLElement | null>,
  dropdownRef: RefObject<HTMLElement | null>,
  isOpen: boolean,
  extraDeps: unknown[] = [],
  scrollableSelector?: string
) {
  useEffect(() => {
    if (!isOpen) return
    const trigger = triggerRef.current
    const dropdown = dropdownRef.current
    if (!trigger || !dropdown) return

    const updatePosition = () => {
      const rect = trigger.getBoundingClientRect()
      const dropdownHeight = dropdown.offsetHeight
      const spaceBelow = window.innerHeight - rect.bottom - GAP
      const spaceAbove = rect.top - GAP
      const placeAbove = spaceBelow < dropdownHeight && spaceAbove > spaceBelow

      dropdown.style.position = 'fixed'
      dropdown.style.left = `${rect.left}px`
      dropdown.style.width = `${rect.width}px`

      const MAX_HEIGHT = Math.min(window.innerHeight * 0.6, 520)

      if (placeAbove) {
        dropdown.style.top = 'auto'
        dropdown.style.bottom = `${window.innerHeight - rect.top + GAP}px`
        dropdown.style.maxHeight = `${Math.min(spaceAbove, MAX_HEIGHT)}px`
      } else {
        dropdown.style.top = `${rect.bottom + GAP}px`
        dropdown.style.bottom = 'auto'
        dropdown.style.maxHeight = `${Math.min(spaceBelow, MAX_HEIGHT)}px`
      }
    }

    updatePosition()

    // rAF throttle: scroll/resize fire at 60fps; one updatePosition per frame is enough.
    let rafId: number | null = null
    const scheduleUpdate = () => {
      if (rafId !== null) return
      rafId = requestAnimationFrame(() => {
        rafId = null
        updatePosition()
      })
    }

    const scrollable = scrollableSelector ? trigger.closest(scrollableSelector) : null
    scrollable?.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate, { passive: true })

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      scrollable?.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
    }
    // Deps complete; spread `...extraDeps` defeats static dep verification.
    // react-doctor-disable-next-line react-doctor/exhaustive-deps
  }, [isOpen, triggerRef, dropdownRef, scrollableSelector, ...extraDeps])
}
