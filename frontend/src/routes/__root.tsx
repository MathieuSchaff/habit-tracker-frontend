import { createRootRouteWithContext, useNavigate, useRouterState } from '@tanstack/react-router'
import { lazy, Suspense, useEffect } from 'react'

// Excluded from prod bundle - Vite resolves import.meta.env.DEV at build time
const TanStackRouterDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/router-devtools').then((m) => ({
        default: m.TanStackRouterDevtools,
      }))
    )
  : () => null

import { AppErrorBoundary } from '../component/Feedback/app/AppErrorBoundary/AppErrorBoundary'
import { GlobalError } from '../component/Feedback/app/GlobalError/GlobalError'
import { NavigationProgress } from '../component/Feedback/app/NavigationProgress/NavigationProgress'
import { AppLayout } from '../component/Layout/AppLayout/AppLayout'
import { ensureFresh } from '../lib/auth/freshness'
import { hasSessionHint } from '../lib/auth/sessionHint'
import { useTokenRefresh } from '../lib/hooks/useTokenRefresh'
import type { RouterContext } from '../routerContext'
import { useAuthStore } from '../store/auth'

function RootComponent() {
  useTokenRefresh()
  useSessionExpiredRedirect()
  useBannedRedirect()
  return (
    <AppErrorBoundary>
      <NavigationProgress />
      <AppLayout />
      <Suspense>
        <TanStackRouterDevtools />
      </Suspense>
    </AppErrorBoundary>
  )
}

// Reacts to the sessionExpired flag set by authFetch when a 401-recovery
// refresh fails: clears auth and redirects to /auth/login with the current
// path so the user lands back here after re-login.
function useSessionExpiredRedirect() {
  const sessionExpired = useAuthStore((s) => s.sessionExpired)
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  useEffect(() => {
    if (!sessionExpired) return
    // Already on the auth flow - clear the flag without redirecting.
    if (pathname.startsWith('/auth/')) {
      useAuthStore.getState().clearSessionExpired()
      return
    }
    const store = useAuthStore.getState()
    store.clearAuth()
    store.clearSessionExpired()
    navigate({ to: '/auth/login', search: { redirect: pathname } })
  }, [sessionExpired, pathname, navigate])
}

function useBannedRedirect() {
  const banned = useAuthStore((s) => s.banned)
  const bannedDetails = useAuthStore((s) => s.bannedDetails)
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  useEffect(() => {
    if (!banned) return
    useAuthStore.getState().clearBanned()
    if (pathname === '/auth/banned') return
    navigate({
      to: '/auth/banned',
      search: {
        reason: bannedDetails?.reason ?? undefined,
        expires: bannedDetails?.expiresAt ?? undefined,
      },
    })
  }, [banned, bannedDetails, navigate, pathname])
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: ({ context, preload }) => {
    // Skip link hover prefetch; real navigation re-runs this with preload=false.
    if (preload) return
    if (context.auth.accessToken) return
    // One-shot probe at boot: hydrate session from refresh cookie, then stop
    // so subsequent navigations don't re-fire /auth/refresh on every click.
    const store = useAuthStore.getState()
    if (store.bootRefreshAttempted) return
    // Anonymous visitor (no session-hint cookie) → skip the probe and its loader gate.
    if (!hasSessionHint()) return
    store.markBootRefreshAttempted()
    // Optimistic boot: render the shell now (neutral nav skeleton while pending) instead of
    // gating the whole tree on the network.
    store.setBootRefreshPending(true)
    void ensureFresh(context.queryClient).finally(() => {
      useAuthStore.getState().setBootRefreshPending(false)
    })
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
