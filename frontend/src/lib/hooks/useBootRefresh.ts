import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'

import { ensureFresh } from '@/lib/auth/freshness'
import { hasSessionHint } from '@/lib/auth/sessionHint'
import { useAuthStore } from '@/store/auth'

// Root loaders do not rerun at hydration, so the boot probe must live in a client effect.
export function useBootRefresh() {
  const queryClient = useQueryClient()
  const router = useRouter()

  useEffect(() => {
    const store = useAuthStore.getState()
    if (store.accessToken) return
    if (store.bootRefreshAttempted) return
    store.markBootRefreshAttempted()
    // No client hint means boot resolved anonymously without a request.
    if (!hasSessionHint()) return
    // Keep the neutral shell visible while refresh resolves.
    store.setBootRefreshPending(true)
    void ensureFresh(queryClient).finally(() => {
      const settled = useAuthStore.getState()
      settled.setBootRefreshPending(false)
      // SSR loaders ran anonymously. Re-run them once auth is available.
      // Loader errors surface via route errorComponents; the rejection here is redundant.
      if (settled.accessToken) void router.invalidate().catch(() => {})
    })
  }, [queryClient, router])
}
