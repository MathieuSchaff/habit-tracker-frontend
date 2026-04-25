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

import { GlobalError } from '../component/Feedback/app/GlobalError/GlobalError'
import { NavigationProgress } from '../component/Feedback/app/NavigationProgress/NavigationProgress'
import { AppLayout } from '../component/Layout/AppLayout/AppLayout'
import { useTokenRefresh } from '../lib/hooks/useTokenRefresh'
import { silentRefresh } from '../lib/queries/silentRefresh'
import type { RouterContext } from '../routerContext'
import { useAuthStore } from '../store/auth'

function RootComponent() {
  useTokenRefresh()
  return (
    <>
      <NavigationProgress />
      <AppLayout />
      <Suspense>
        <TanStackRouterDevtools />
      </Suspense>
    </>
  )
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async ({ context, preload }) => {
    // Skip during link hover prefetch — actual navigation re-runs this with preload=false.
    if (preload) return
    if (context.auth.accessToken) return
    // One-shot probe at boot: if there's a valid refresh cookie, hydrate the session.
    // After the first attempt (success or fail) we stop, so subsequent navigations
    // don't re-fire /auth/refresh on every click.
    const store = useAuthStore.getState()
    if (store.bootRefreshAttempted) return
    store.markBootRefreshAttempted()
    await silentRefresh(context.queryClient)
  },
  component: RootComponent,
  errorComponent: ({ error, reset }) => <GlobalError error={error} reset={reset} />,
  notFoundComponent: () => (
    <GlobalError
      error={new Error("The page you're looking for doesn't exist.")}
      reset={() => window.location.assign('/')}
      is404
    />
  ),
})
