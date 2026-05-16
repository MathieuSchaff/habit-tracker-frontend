import type { QueryClient } from '@tanstack/react-query'
import { isRedirect, redirect } from '@tanstack/react-router'

import { useAuthStore } from '../../store/auth'
import { authQueries } from '../queries/auth'
import { silentRefresh } from '../queries/silentRefresh'

type RequireAuthOptions = {
  queryClient: QueryClient
  pathname: string
  /** Access token from router context — avoids reading Zustand store directly in route guards. */
  accessToken: string | null
}

/**
 * Route guard: local token check, server verify, silent refresh fallback, then redirect.
 * During silentRefresh cooldown we don't log out — network blips recover via the 401 interceptor.
 */
export async function requireAuth({
  queryClient,
  pathname,
  accessToken,
}: RequireAuthOptions): Promise<void> {
  const store = useAuthStore.getState()

  if (!accessToken || store.isTokenExpired()) {
    const result = await silentRefresh(queryClient)
    // Cooldown + no token = never had a session, redirect. Cooldown + expired token = let 401 interceptor recover.
    if (result === 'failed' || (result === 'cooldown' && !accessToken)) {
      clearAndRedirect(store, queryClient, pathname)
    }
    return
  }

  try {
    // Token can look valid locally but already be revoked server-side.
    await queryClient.ensureQueryData(authQueries.session())
  } catch (error) {
    if (isRedirect(error)) throw error
    const result = await silentRefresh(queryClient)
    if (result === 'failed') clearAndRedirect(store, queryClient, pathname)
  }
}

function clearAndRedirect(
  store: ReturnType<typeof useAuthStore.getState>,
  queryClient: QueryClient,
  pathname: string
): never {
  store.clearAuth()
  // Drop all cached queries on session end (mirrors useLogout, includes user-scoped lists).
  queryClient.clear()
  throw redirect({
    to: '/auth/login',
    search: { redirect: pathname },
  })
}
