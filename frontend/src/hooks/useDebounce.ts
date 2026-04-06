import { useEffect, useState } from 'react'

/**
 * Returns a debounced copy of the value that only updates after `delay` ms
 * without any new change. Useful to throttle expensive effects like queries.
 */
export function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
