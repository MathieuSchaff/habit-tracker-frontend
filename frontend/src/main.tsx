// Global styles first: declares the @layer order before any component CSS can
// register a layer (else routeTree's component CSS inverts the cascade).
import './styles/index.css'

import { QueryClientProvider } from '@tanstack/react-query'
import { createRouter, type ParsedLocation, RouterProvider } from '@tanstack/react-router'
import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'

import { initFaro } from './lib/observability/faro'
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

// startViewTransition snapshots then synchronously re-renders the whole page
// before animating; on slow CPUs that freezes the main thread ~840ms per nav. We
// only pay that for the transitions that earn it: the list and detail hero morph
// (shared-element) and the detail tab swap. Every other nav (section fades,
// generic fallback) skips VT and stays instant. Mobile (<=767px) / reduced-motion
// skip everything.
const skipViewTransition = window.matchMedia('(max-width: 767px), (prefers-reduced-motion: reduce)')
const KEEP_VT_TYPES = new Set(['shared-element', 'tab-switch'])

function viewTransitionForNav(from: ParsedLocation | undefined, to: ParsedLocation) {
  if (skipViewTransition.matches) return false
  const types = resolveTransitionType({
    fromPathname: from?.pathname ?? null,
    toPathname: to.pathname,
  })
  if (!types) return false
  return types.some((t) => KEEP_VT_TYPES.has(t)) ? viewTransition : false
}

const router = createRouter({
  routeTree,
  context: {
    queryClient,
    auth: { isAuthenticated: false, accessToken: null },
  } satisfies RouterContext,
  // Vite injects route CSS as <style> on dev hover-preload, causing a repaint flash on the current
  // page. Prod ships one bundled chunk per route, so keep intent prefetch there only.
  defaultPreload: import.meta.env.PROD ? 'intent' : false,
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  // Delay pending UI so fast nav doesn't flash a loader.
  defaultPendingMs: 200,
  defaultViewTransition: false,
})

// Router reads options.defaultViewTransition live when it commits a nav (after
// this event fires), so deciding per-nav here scopes VT without re-passing context.
router.subscribe('onBeforeNavigate', ({ fromLocation, toLocation }) => {
  router.options.defaultViewTransition = viewTransitionForNav(fromLocation, toLocation)
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

initFaro()

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
