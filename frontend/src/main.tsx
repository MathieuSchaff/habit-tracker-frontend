import { QueryClientProvider } from '@tanstack/react-query'
import { createRouter, type ParsedLocation, RouterProvider } from '@tanstack/react-router'
import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'

import { reportError } from './lib/errorReporter'
import { queryClient } from './lib/queryClient'
import { resolveTransitionType } from './lib/transitions/resolveTransitionType'
import { routeTree } from './routeTree.gen'
import { useAuthStore } from './store/auth'
import '@fontsource/dm-sans/400.css'
import '@fontsource/dm-sans/500.css'
import '@fontsource/dm-sans/600.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/young-serif/400.css'
import './styles/index.css'

import type { RouterContext } from './routerContext'

// Excluded from prod bundle - Vite resolves import.meta.env.DEV at build time
const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((m) => ({
        default: m.ReactQueryDevtools,
      }))
    )
  : () => null
const viewTransition = {
  types: ({
    fromLocation,
    toLocation,
  }: {
    fromLocation?: ParsedLocation
    toLocation: ParsedLocation
  }) =>
    resolveTransitionType({
      fromPathname: fromLocation?.pathname ?? null,
      toPathname: toLocation.pathname,
    }),
}

// A view transition snapshots then synchronously re-renders the whole page
// before animating; on mobile/slow CPUs that freezes the main thread ~0.5s per
// nav. Below --mobile (or with reduced-motion) we skip startViewTransition
// entirely so nav stays instant. The router reads defaultViewTransition live
// per nav, so swapping it on a media-query change is enough.
const skipViewTransition = window.matchMedia('(max-width: 767px), (prefers-reduced-motion: reduce)')

const router = createRouter({
  routeTree,
  context: {
    queryClient,
    auth: { isAuthenticated: false, accessToken: null },
  } satisfies RouterContext,
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  // Delay pending UI so fast nav doesn't flash a loader.
  defaultPendingMs: 200,
  defaultViewTransition: skipViewTransition.matches ? false : viewTransition,
})

skipViewTransition.addEventListener('change', (e) => {
  // Router reads options.defaultViewTransition live per nav, so mutating it is
  // enough (router.update would require re-passing context).
  router.options.defaultViewTransition = e.matches ? false : viewTransition
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

function InnerApp() {
  const accessToken = useAuthStore((s) => s.accessToken)
  return (
    <RouterProvider
      router={router}
      context={{ queryClient, auth: { isAuthenticated: !!accessToken, accessToken } }}
    />
  )
}

// Safety net for promise rejections escaping every other handler; logs to backend without surfacing to user.
window.addEventListener('unhandledrejection', (e) => {
  const err = e.reason instanceof Error ? e.reason : new Error(String(e.reason))
  reportError(err, { source: 'unhandledrejection' })
})
window.addEventListener('error', (e) => {
  if (!e.error) return
  reportError(e.error as Error, { source: 'window.error' })
})

// biome-ignore lint: root will be here
const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = createRoot(rootElement)
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <InnerApp />
        <Suspense>
          <ReactQueryDevtools />
        </Suspense>
      </QueryClientProvider>
    </StrictMode>
  )
}
