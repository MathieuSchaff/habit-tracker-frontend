import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { useAuthStore } from '../../store/auth'
import { ensureFresh, isExpired, msUntilProactiveRefresh } from '../auth/freshness'

// Schedule silent refresh ~1 min before expiry. setAuth updates tokenExpiresAt, retriggering this effect.
export function useTokenRefresh() {
  const tokenExpiresAt = useAuthStore((s) => s.tokenExpiresAt)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!tokenExpiresAt) return

    const delay = msUntilProactiveRefresh(tokenExpiresAt)

    if (delay <= 0) {
      ensureFresh(queryClient)
      return
    }

    const timer = setTimeout(() => ensureFresh(queryClient), delay)
    return () => clearTimeout(timer)
  }, [tokenExpiresAt, queryClient])

  // Background tabs throttle setTimeout; refresh on visibility regain so focus queries don't all 401.
  useEffect(() => {
    function handleVisible() {
      if (document.visibilityState !== 'visible') return
      if (!useAuthStore.getState().accessToken) return
      if (isExpired()) ensureFresh(queryClient)
    }
    document.addEventListener('visibilitychange', handleVisible)
    return () => document.removeEventListener('visibilitychange', handleVisible)
  }, [queryClient])
}
