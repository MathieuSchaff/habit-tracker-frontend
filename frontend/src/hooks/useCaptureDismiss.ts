import { type RefObject, useEffect, useRef } from 'react'

type AnyRef = RefObject<HTMLElement | null>

/**
 * Tap-blocking outside-click dismiss for portaled menus, popovers and
 * comboboxes that float over real click targets (Links, Cards, buttons).
 *
 * Differs from `useClickOutside` in three ways that matter:
 *  1. Listens on `click` (not `mousedown`) so the whole click chain is in scope.
 *  2. Listens in **capture phase**, so this handler fires before the target.
 *  3. Calls `preventDefault` + `stopPropagation`, swallowing the click.
 *
 * Why: a `mousedown` hook dismisses the menu but lets the subsequent `click`
 * reach the target underneath, causing surprise navigation on mobile (no
 * Escape key, no hover). Industry standard (Apple HIG, Material Design, Radix
 * UI, Headless UI) is to consume the outside tap entirely.
 *
 * Choice rule:
 *  - Use `useCaptureDismiss` when the component floats over NON-INTENTIONAL
 *    content (app body, product cards, page underneath). Tap outside = cancel,
 *    no side effects.
 *  - Use `useClickOutside` when the component lives INSIDE a deliberately
 *    interactive container (drawer with Apply/Reset, form with sibling inputs).
 *    Tap outside should activate the target it landed on.
 *
 * Always pass `{ enabled }` when the component can be closed - a permanently
 * attached capture listener will swallow EVERY click in the app.
 */
export const useCaptureDismiss = (
  refOrRefs: AnyRef | AnyRef[],
  onDismiss: (event: MouseEvent) => void,
  options?: { enabled?: boolean }
) => {
  const enabled = options?.enabled ?? true

  // Keep refs + handler in refs of their own so the listener stays attached
  // across renders even when callers pass a fresh array literal each time.
  const callbackRef = useRef(onDismiss)
  callbackRef.current = onDismiss
  const refsRef = useRef<AnyRef[]>([])
  refsRef.current = Array.isArray(refOrRefs) ? refOrRefs : [refOrRefs]

  useEffect(() => {
    if (!enabled) return

    const listener = (event: MouseEvent) => {
      const target = event.target as Node
      for (const r of refsRef.current) {
        if (r.current?.contains(target)) return
      }
      event.preventDefault()
      event.stopPropagation()
      callbackRef.current(event)
    }

    document.addEventListener('click', listener, true)
    return () => document.removeEventListener('click', listener, true)
  }, [enabled])
}
