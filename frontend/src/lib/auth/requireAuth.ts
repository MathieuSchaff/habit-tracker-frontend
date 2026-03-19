import type { QueryClient } from '@tanstack/react-query'
import { redirect } from '@tanstack/react-router'

import { useAuthStore } from '../../store/auth'
import { authQueries } from '../queries/auth'
import { silentRefresh } from '../queries/silentRefresh'

type RequireAuthOptions = {
  queryClient: QueryClient
  pathname: string
}

// Auth guard for TanStack Router 'beforeLoad'
export async function requireAuth({ queryClient, pathname }: RequireAuthOptions): Promise<void> {
  const store = useAuthStore.getState()

  if (!store.accessToken || store.isTokenExpired()) {
    // Try to recover session before redirecting
    const refreshed = await silentRefresh(queryClient)
    if (!refreshed) {
      clearAndRedirect(store, queryClient, pathname)
    }
    return
  }

  try {
    // Ensure we actually have a valid session on the server
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
