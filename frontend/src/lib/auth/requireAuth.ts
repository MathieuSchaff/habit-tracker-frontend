import type { QueryClient } from '@tanstack/react-query'
import { redirect } from '@tanstack/react-router'

import { useAuthStore } from '../../store/auth'
import { authQueries } from '../queries/auth'
import { silentRefresh } from '../queries/silentRefresh'

type RequireAuthOptions = {
  queryClient: QueryClient
  pathname: string
}

/**
 * Guards the route by checking local token validity first, then verifying with the server.
 * Falls back to a silent refresh before giving up and redirecting to login.
 */
export async function requireAuth({ queryClient, pathname }: RequireAuthOptions): Promise<void> {
  const store = useAuthStore.getState()

  if (!store.accessToken || store.isTokenExpired()) {
    const refreshed = await silentRefresh(queryClient)
    if (!refreshed) {
      clearAndRedirect(store, queryClient, pathname)
    }
    return
  }

  try {
    // Local token can look valid but already be revoked server-side, so we double-check
    await queryClient.ensureQueryData(authQueries.session())
  } catch {
    const refreshed = await silentRefresh(queryClient)
    if (!refreshed) {
      clearAndRedirect(store, queryClient, pathname)
    }
  }
}

function clearAndRedirect(
  store: ReturnType<typeof useAuthStore.getState>,
  queryClient: QueryClient,
  pathname: string
): never {
  store.clearAuth()
  queryClient.removeQueries({ queryKey: ['session'] })
  queryClient.removeQueries({ queryKey: ['auth'] })
  throw redirect({
    to: '/auth/login',
    search: { redirect: pathname },
  })
}
