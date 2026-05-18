import { useEffect, useState } from 'react'

import type { FilterOption } from '../types'

// Tracks { slug → label } from all incoming option sources (search + resolve).
// Chips can render the human label as soon as it's been seen anywhere, falling
// back to the raw value when no source has resolved yet.
export function useLabelCache(
  primary: FilterOption[] | undefined,
  secondary: FilterOption[] | undefined
): Record<string, string> {
  const [cache, setCache] = useState<Record<string, string>>({})

  useEffect(() => {
    const incoming = [...(primary ?? []), ...(secondary ?? [])]
    if (incoming.length === 0) return
    setCache((prev) => {
      let changed = false
      const next = { ...prev }
      for (const opt of incoming) {
        if (next[opt.value] !== opt.label) {
          next[opt.value] = opt.label
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [primary, secondary])

  return cache
}
