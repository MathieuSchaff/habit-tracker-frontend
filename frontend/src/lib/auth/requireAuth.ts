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
 * Guards the route by checking local token validity first, then verifying with the server.
 * Falls back to a silent refresh before giving up and redirecting to login.
 *
 * Cooldown handling: when silentRefresh is throttled by its backoff window, we don't have
 * a definitive answer. We let the user stay on the route instead of logging them out on
 * what may be a transient network blip — queries will still go through the 401 interceptor
 * (which also respects the cooldown) and recover once the window expires.
 */
export async function requireAuth({
  queryClient,
  pathname,
  accessToken,
}: RequireAuthOptions): Promise<void> {
  const store = useAuthStore.getState()

  if (!accessToken || store.isTokenExpired()) {
    const result = await silentRefresh(queryClient)
    // cooldown with no token = never had a session, redirect; with an expired token = possible
    // network blip, let them stay and recover via the 401 interceptor
    if (result === 'failed' || (result === 'cooldown' && !accessToken)) {
      clearAndRedirect(store, queryClient, pathname)
    }
    return
  }

  try {
    // Local token can look valid but already be revoked server-side, so we double-check
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
  // Same hygiene as useLogout — drop all cached queries when the session
  // ends, including user-scoped product lists. See queries/auth.ts.
  queryClient.clear()
  throw redirect({
    to: '/auth/login',
    search: { redirect: pathname },
  })
}
