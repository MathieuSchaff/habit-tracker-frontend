import { useEffect, useState } from 'react'

// PWA install state. The bottom nav is reserved for standalone (installed) mode, so gate its
// render on this (not just CSS) to keep browser tabs from mounting it. Reactive because a
// session can launch straight into standalone.
const QUERY = '(display-mode: standalone)'

export function useIsStandalone() {
  const [isStandalone, setIsStandalone] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches
  )

  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const onChange = () => setIsStandalone(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return isStandalone
}
