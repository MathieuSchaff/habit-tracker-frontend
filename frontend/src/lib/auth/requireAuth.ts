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
 * Auth guard réutilisable pour les `beforeLoad` de TanStack Router.
 *
 * Vérifie le token, tente un silent refresh si nécessaire,
 * et redirige vers /login en cas d'échec.
 *
 * @example
 * beforeLoad: async ({ context, location }) => {
 *   await requireAuth({ queryClient: context.queryClient, pathname: location.pathname })
 * }
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
