import { useEffect, useState } from 'react'

// Mirrors the --mobile breakpoint (breakpoints.css). Reactive so the nav can swap between
// desktop sidebar and modal drawer when the viewport crosses the breakpoint.
const QUERY = '(max-width: 767px)'

export function useIsMobile() {
  // Init false to match SSR (window is undefined server-side); reading matchMedia
  // here instead would diverge from the server render on mobile and break hydration.
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    setIsMobile(mq.matches)
    const onChange = () => setIsMobile(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return isMobile
}
