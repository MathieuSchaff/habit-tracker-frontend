import { createRootRouteWithContext } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'

import { AppLayout } from '../component/Layout/AppLayout/AppLayout'
import { silentRefresh } from '../lib/queries/silentRefresh'
import type { RouterContext } from '../routerContext'
import { useAuthStore } from '../store/auth'

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async ({ context }) => {
    // Attempt silent refresh on initial load to recover session from httpOnly cookie
    if (!useAuthStore.getState().accessToken) {
      await silentRefresh(context.queryClient)
    }
  },
  component: () => (
    <>
      <AppLayout />
      <TanStackRouterDevtools />
    </>
  ),
  errorComponent: () => <div>404 Not found</div>,
})
