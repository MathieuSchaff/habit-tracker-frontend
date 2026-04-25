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

  // Background tabs throttle setTimeout heavily (can drift by minutes), so the scheduled
  // refresh above may fire late or not at all when the user comes back. Catch the moment
  // the tab regains visibility and proactively refresh if the token is already expired,
  // so queries firing on focus don't all 401 first.
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
