import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { useAuthStore } from '../../store/auth'
import { silentRefresh } from '../queries/silentRefresh'

// Schedule a silent refresh ~1 minute before the access token expires.
// When silentRefresh succeeds, setAuth updates tokenExpiresAt, which
// re-triggers this effect and schedules the next refresh automatically.
export function useTokenRefresh() {
  const tokenExpiresAt = useAuthStore((s) => s.tokenExpiresAt)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!tokenExpiresAt) return

    const delay = tokenExpiresAt - Date.now() - 60_000

    if (delay <= 0) {
      silentRefresh(queryClient)
      return
    }

    const timer = setTimeout(() => silentRefresh(queryClient), delay)
    return () => clearTimeout(timer)
  }, [tokenExpiresAt, queryClient])
}
