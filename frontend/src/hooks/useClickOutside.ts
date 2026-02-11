import { type RefObject, useEffect, useRef } from 'react'

export const useClickOutside = (
  ref: RefObject<HTMLElement | null>,
  handleOnClickOutside: (event: MouseEvent | TouchEvent | KeyboardEvent) => void
) => {
  const callbackRef = useRef(handleOnClickOutside)
  callbackRef.current = handleOnClickOutside

  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return
      }
      callbackRef.current(event)
    }

    const keyListener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        callbackRef.current(event)
      }
    }

    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)
    document.addEventListener('keydown', keyListener)

    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
      document.removeEventListener('keydown', keyListener)
    }
  }, [ref])
}
