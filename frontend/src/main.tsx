import { QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'

import { reportError } from './lib/errorReporter'
import { queryClient } from './lib/queryClient'
import { resolveTransitionType } from './lib/transitions/resolveTransitionType'
import { routeTree } from './routeTree.gen'
import { useAuthStore } from './store/auth'
import './styles/index.css'

import type { RouterContext } from './routerContext'

// Excluded from prod bundle — Vite resolves import.meta.env.DEV at build time
const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((m) => ({
        default: m.ReactQueryDevtools,
      }))
    )
  : () => null
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
  defaultViewTransition: {
    types: ({ fromLocation, toLocation }) =>
      resolveTransitionType({
        fromPathname: fromLocation?.pathname ?? null,
        toPathname: toLocation.pathname,
      }),
  },
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
