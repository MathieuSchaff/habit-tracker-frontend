import { createRouter, type ParsedLocation } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'

import { getCspNonce } from './lib/csp/nonce'
import { isServer } from './lib/helpers/isServer'
import { queryClient as clientQueryClient, makeQueryClient } from './lib/queryClient'
import { resolveTransitionType } from './lib/transitions/resolveTransitionType'
import type { RouterContext } from './routerContext'
import { routeTree } from './routeTree.gen'
import { useAuthStore } from './store/auth'

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

const KEEP_VT_TYPES = new Set(['shared-element', 'tab-switch'])

// startViewTransition snapshots then synchronously re-renders the whole page
// before animating; on slow CPUs that freezes the main thread ~840ms per nav. We
// only pay that for the transitions that earn it: the list and detail hero morph
// (shared-element) and the detail tab swap. Every other nav (section fades,
// generic fallback) skips VT and stays instant. Mobile (<=767px) / reduced-motion
// skip everything.
function viewTransitionForNav(from: ParsedLocation | undefined, to: ParsedLocation, skip: boolean) {
  if (skip) return false
  const types = resolveTransitionType({
    fromPathname: from?.pathname ?? null,
    toPathname: to.pathname,
  })
  if (!types) return false
  return types.some((t) => KEEP_VT_TYPES.has(t)) ? viewTransition : false
}
export function getRouter() {
  const queryClient = import.meta.env.SSR ? makeQueryClient() : clientQueryClient
  const router = createRouter({
    routeTree,
    context: {
      queryClient,
      // Seeded at creation, kept live by the store subscription below; stays
      // null during anonymous server rendering.
      auth: {
        isAuthenticated: !!useAuthStore.getState().accessToken,
        accessToken: useAuthStore.getState().accessToken,
      },
    } satisfies RouterContext,
    // Vite injects route CSS as <style> on dev hover-preload, causing a repaint flash on the current
    // page. Prod ships one bundled chunk per route, so keep intent prefetch there only.
    defaultPreload: import.meta.env.PROD ? 'intent' : false,
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
    // Delay pending UI so fast nav doesn't flash a loader.
    defaultPendingMs: 200,
    defaultViewTransition: false,
    // Stamp Start's inline hydration scripts with the per-request nonce so the
    // strict CSP (script-src 'self' 'nonce-…') lets them run. Undefined on the
    // client and during any non-proxied request; the nonce only matters server-side.
    ssr: { nonce: getCspNonce() },
  })

  // Dehydrates the per-request server Query cache into the SSR payload and
  // hydrates it into the client cache, so components re-using the loaders'
  // queries (useSuspenseQuery) don't refetch what SSR already fetched. Also
  // installs the QueryClientProvider wrap.
  setupRouterSsrQueryIntegration({ router, queryClient })

  if (!isServer) {
    // The router only reads context when a navigation matches routes, so route
    // guards (login redirect, requireAuth, dermo prefetch) would otherwise see
    // the token as it was at creation: always null, since the token arrives
    // after the async boot refresh. Keep it live from the store instead.
    useAuthStore.subscribe((s) => {
      router.options.context.auth = {
        isAuthenticated: !!s.accessToken,
        accessToken: s.accessToken,
      }
    })

    const skipVt = window.matchMedia('(max-width: 767px), (prefers-reduced-motion: reduce)')
    // Router reads options.defaultViewTransition live when it commits a nav (after
    // this event fires), so deciding per-nav here scopes VT without re-passing context.
    router.subscribe('onBeforeNavigate', ({ fromLocation, toLocation }) => {
      router.options.defaultViewTransition = viewTransitionForNav(
        fromLocation,
        toLocation,
        skipVt.matches
      )
    })
  }

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
