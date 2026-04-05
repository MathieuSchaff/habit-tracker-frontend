import { createRootRouteWithContext } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

// Excluded from prod bundle — Vite resolves import.meta.env.DEV at build time
const TanStackRouterDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/router-devtools').then((m) => ({
        default: m.TanStackRouterDevtools,
      }))
    )
  : () => null

import { GlobalError } from '../component/Feedback/GlobalError/GlobalError'
import { NavigationProgress } from '../component/Feedback/NavigationProgress/NavigationProgress'
import { AppLayout } from '../component/Layout/AppLayout/AppLayout'
import { silentRefresh } from '../lib/queries/silentRefresh'
import type { RouterContext } from '../routerContext'
import { useAuthStore } from '../store/auth'

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async ({ context }) => {
    // We try to refresh the session at start for recover it from the cookie httpOnly.
    if (!useAuthStore.getState().accessToken) {
      await silentRefresh(context.queryClient)
    }
  },
  component: () => (
    <>
      <NavigationProgress />
      <AppLayout />
      <Suspense>
        <TanStackRouterDevtools />
      </Suspense>
    </>
  ),
  errorComponent: ({ error, reset }) => <GlobalError error={error} reset={reset} />,
  notFoundComponent: () => (
    <GlobalError
      error={new Error("The page you're looking for doesn't exist.")}
      reset={() => window.location.assign('/')}
      is404
    />
  ),
})
