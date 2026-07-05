import { useEffect, useState } from 'react'

// Transient message for the assertive sr-only region; auto-clears so the
// next identical announcement still triggers a screen-reader read.
export function useAnnouncement() {
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    if (!announcement) return
    const t = setTimeout(() => setAnnouncement(''), 1000)
    return () => clearTimeout(t)
  }, [announcement])

  return [announcement, setAnnouncement] as const
}
