import { useEffect, useState } from 'react'

// Mirrors the --mobile breakpoint (breakpoints.css). Reactive so the nav can swap between
// desktop sidebar and modal drawer when the viewport crosses the breakpoint.
const QUERY = '(max-width: 767px)'

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches
  )

  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const onChange = () => setIsMobile(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return isMobile
}
