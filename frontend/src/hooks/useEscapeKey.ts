import { useEffect, useRef } from 'react'

export function useEscapeKey(handler: () => void) {
  // Keep latest handler in a ref so listener stays attached across renders.
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
