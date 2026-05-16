import { QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'

import { navItems } from './component/Header/NavItem/NavItem'
import { reportError } from './lib/errorReporter'
import { queryClient } from './lib/queryClient'
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
    types: ({ fromLocation, toLocation }) => {
      if (!fromLocation) return false

      const from = fromLocation.pathname
      const to = toLocation.pathname

      // Same path = search param change only, no transition.
      if (from === to) return false
      const isListPath = (p: string) => p === '/products/' || p === '/ingredients/'
      const isDetailPath = (p: string) => /^\/(products|ingredients)\/[^/]+\/?$/.test(p)
      const isSubPage = (p: string) =>
        /^\/(products|ingredients)\/[^/]+\/(edit|discussions)/.test(p)
      const isDiscussionsPage = (p: string) =>
        /^\/(products|ingredients)\/[^/]+\/discussions/.test(p)
      const isAuth = (p: string) => p.startsWith('/auth/')

      // Same value means we're on the same entity (product/ingredient slug).
      const slugKey = (p: string) => p.split('/').slice(1, 3).join('/')

      const isTabSwitch =
        ((isDetailPath(from) && isDiscussionsPage(to)) ||
          (isDiscussionsPage(from) && isDetailPath(to))) &&
        slugKey(from) === slugKey(to)

      if ((isListPath(from) && isDetailPath(to)) || (isDetailPath(from) && isListPath(to))) {
        return ['crossfade', 'shared-element']
      }

      if (isTabSwitch) {
        return ['tab-switch']
      }

      if (isDetailPath(from) && isSubPage(to)) {
        return ['slide-forward']
      }

      if (isSubPage(from) && isDetailPath(to)) {
        return ['slide-back']
      }

      if (isAuth(from) || isAuth(to)) {
        return ['fade-fast']
      }

      const getNavIndex = (path: string): number => {
        const base = `/${path.split('/')[1] || ''}`
        const normalized = base === '/' ? '/' : base
        return navItems.findIndex((item) => item.to === normalized)
      }

      const fromIdx = getNavIndex(from)
      const toIdx = getNavIndex(to)

      const bothAreNavItems = fromIdx !== -1 && toIdx !== -1
      const isDifferentPage = fromIdx !== toIdx

      if (bothAreNavItems && isDifferentPage) {
        const goingDown = toIdx > fromIdx
        return goingDown ? ['fade-nav-down'] : ['fade-nav-up']
      }

      return ['fade-scale']
    },
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
