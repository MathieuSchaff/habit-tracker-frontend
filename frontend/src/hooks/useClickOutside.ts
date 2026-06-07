import { type RefObject, useEffect, useEffectEvent, useRef } from 'react'

type AnyRef = RefObject<HTMLElement | null>

/**
 * Click-through outside detection on `mousedown` + `touchstart` (bubble phase,
 * passive). The underlying `click` event is NOT blocked - the target the user
 * tapped still receives its native click.
 *
 * Choice rule (mirror of useCaptureDismiss):
 *  - Use `useClickOutside` when the component lives INSIDE a deliberately
 *    interactive container (drawer with Apply/Reset, form with sibling inputs)
 *    and the outside tap should still activate the target it landed on.
 *  - Use `useCaptureDismiss` for portaled menus / popovers floating over
 *    NON-INTENTIONAL content (app body, product cards) where surprise
 *    navigation on mobile is the failure mode.
 */
export const useClickOutside = (
  refOrRefs: AnyRef | AnyRef[],
  handleOnClickOutside: (event: MouseEvent | TouchEvent) => void,
  options?: { enabled?: boolean }
) => {
  const enabled = options?.enabled ?? true

  // Keep refs in a ref of their own so the listener stays attached across
  // renders even when callers pass a fresh array literal each time (the common
  // case for `useClickOutside([wrapperRef, contentRef], …)`).
  const onClickOutside = useEffectEvent(handleOnClickOutside)
  const refsRef = useRef<AnyRef[]>([])
  refsRef.current = Array.isArray(refOrRefs) ? refOrRefs : [refOrRefs]

  useEffect(() => {
    if (!enabled) return

    const listener = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node
      for (const r of refsRef.current) {
        if (r.current?.contains(target)) return
      }
      onClickOutside(event)
    }

    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener, { passive: true })

    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [enabled])
}
