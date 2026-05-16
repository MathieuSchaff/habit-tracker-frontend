import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { useAuthStore } from '../../store/auth'
import { silentRefresh } from '../queries/silentRefresh'

// Schedule silent refresh ~1 min before expiry. setAuth updates tokenExpiresAt, retriggering this effect.
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

  // Background tabs throttle setTimeout; refresh on visibility regain so focus queries don't all 401.
  useEffect(() => {
    function handleVisible() {
      if (document.visibilityState !== 'visible') return
      const store = useAuthStore.getState()
      if (!store.accessToken) return
      if (store.isTokenExpired()) silentRefresh(queryClient)
    }
    document.addEventListener('visibilitychange', handleVisible)
    return () => document.removeEventListener('visibilitychange', handleVisible)
  }, [queryClient])
}
