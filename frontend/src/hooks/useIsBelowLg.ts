import { useEffect, useState } from 'react'

// Mirrors the --below-lg breakpoint (breakpoints.css). Reactive so the nav can swap between
// the inline top bar and the modal drawer when the viewport crosses the breakpoint.
const QUERY = '(max-width: 1023.98px)'

export function useIsBelowLg() {
  // Lazy init reads matchMedia so the first client render already knows the breakpoint
  // (a burger tap before effects run must not be swallowed). SSR renders false; safe as
  // long as consumers only branch interaction-gated UI (the drawer) on this value.
  const [isBelowLg, setIsBelowLg] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches
  )

  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    setIsBelowLg(mq.matches)
    const onChange = () => setIsBelowLg(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return isBelowLg
}
