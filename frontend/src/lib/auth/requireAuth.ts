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
 * Check that the user is logged in and the session is still valid before showing the page.
 * Try to refresh the token if it is expired before sending to login.
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
    // Verify with server that session is still valid, even if local token looks good
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
    to: '/login',
    search: { redirect: pathname },
  })
}
