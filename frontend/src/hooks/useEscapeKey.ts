import { useEffect, useEffectEvent } from 'react'

export function useEscapeKey(handler: () => void) {
  const onEscape = useEffectEvent(handler)

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onEscape()
    }
    document.addEventListener('keydown', listener)
    return () => document.removeEventListener('keydown', listener)
  }, [])
}
