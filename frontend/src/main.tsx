import { QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'

import { navItems } from './component/Header/NavItem/NavItem'
import { queryClient } from './lib/queryClient'
import { routeTree } from './routeTree.gen'
// STYLES
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
// https://tanstack.com/router/latest/docs/api/router/RouterOptionsType
const router = createRouter({
  routeTree,
  context: { queryClient } satisfies RouterContext,
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  // before displaying a loading state, the navigation must take atleast 200ms. So no flash
  defaultPendingMs: 200,
  // https://tanstack.com/router/latest/docs/api/router/ViewTransitionOptionsType
  defaultViewTransition: {
    types: ({ fromLocation, toLocation }) => {
      if (!fromLocation) return false

      const from = fromLocation.pathname
      const to = toLocation.pathname

      // Search param changes (filters, pagination) — no transition
      if (from === to) return false
      // full page products or ingredients
      const isListPath = (p: string) => p === '/products/' || p === '/ingredients/'
      // page/slug of products or ingredients
      const isDetailPath = (p: string) => /^\/(products|ingredients)\/[^/]+\/?$/.test(p)
      // page/slug/ edit or discussions of products or ingredients
      const isSubPage = (p: string) =>
        /^\/(products|ingredients)\/[^/]+\/(edit|discussions)/.test(p)
      const isDiscussionsPage = (p: string) =>
        /^\/(products|ingredients)\/[^/]+\/discussions/.test(p)
      // route is auth?
      const isAuth = (p: string) => p.startsWith('/auth/')

      // "type/slug" key — same value means we're on the same entity
      const slugKey = (p: string) => p.split('/').slice(1, 3).join('/')

      // Tab switch: infos <-> discussions on the same product/ingredient
      const isTabSwitch =
        ((isDetailPath(from) && isDiscussionsPage(to)) ||
          (isDiscussionsPage(from) && isDetailPath(to))) &&
        slugKey(from) === slugKey(to)

      // Navigation between products or ingredients page to their respective slug page
      if ((isListPath(from) && isDetailPath(to)) || (isDetailPath(from) && isListPath(to))) {
        return ['crossfade', 'shared-element']
      }

      // Tab switch (infos <-> discussions): only the outlet content should animate
      if (isTabSwitch) {
        return ['tab-switch']
      }

      // Slug page to edit or discussion (different entity or edit page)
      if (isDetailPath(from) && isSubPage(to)) {
        return ['slide-forward']
      }

      // Edit or discussion page to slug page
      if (isSubPage(from) && isDetailPath(to)) {
        return ['slide-back']
      }

      // Auth pages: fast fade
      if (isAuth(from) || isAuth(to)) {
        return ['fade-fast']
      }

      // Nav items directional fade based on position in navItems
      const getNavIndex = (path: string): number => {
        const base = `/${path.split('/')[1] || ''}`
        const normalized = base === '/' ? '/' : base
        return navItems.findIndex((item) => item.to === normalized)
      }

      const fromIdx = getNavIndex(from)
      const toIdx = getNavIndex(to)

      // are the two routes in the main nav?
      const bothAreNavItems = fromIdx !== -1 && toIdx !== -1

      // is it the same page?
      const isDifferentPage = fromIdx !== toIdx

      if (bothAreNavItems && isDifferentPage) {
        // are we going down in the nav?
        const goingDown = toIdx > fromIdx
        return goingDown ? ['fade-nav-down'] : ['fade-nav-up']
      }

      // Everything other route : we do fade + scale
      return ['fade-scale']
    },
  },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// biome-ignore lint: root will be here
const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = createRoot(rootElement)
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Suspense>
          <ReactQueryDevtools />
        </Suspense>
      </QueryClientProvider>
    </StrictMode>
  )
}
