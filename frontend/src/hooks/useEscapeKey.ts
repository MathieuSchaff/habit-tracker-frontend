import { useEffect, useRef } from 'react'

/**
 * Calls the handler when the user presses Escape. We keep the handler in a
 * ref so the listener doesn't need to be re-attached on every render.
 */
export function useEscapeKey(handler: () => void) {
  const callbackRef = useRef(handler)
  callbackRef.current = handler

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') callbackRef.current()
    }
    document.addEventListener('keydown', listener)
    return () => document.removeEventListener('keydown', listener)
  }, [])
}
