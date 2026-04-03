import { QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'

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

const router = createRouter({
  routeTree,
  context: { queryClient } satisfies RouterContext,
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  defaultPendingMs: 200,
  defaultViewTransition: {
    types: ({ fromLocation, toLocation }) => {
      if (!fromLocation) return false

      const from = fromLocation.pathname
      const to = toLocation.pathname

      const isListPath = (p: string) => p === '/products/' || p === '/ingredients/'
      const isDetailPath = (p: string) =>
        /^\/(products|ingredients)\/[^/]+\/?$/.test(p)
      const isSubPage = (p: string) =>
        /^\/(products|ingredients)\/[^/]+\/(edit|discussions)/.test(p)
      const isAuth = (p: string) => p.startsWith('/auth/')

      // List <-> Detail: crossfade with shared element morph
      if (
        (isListPath(from) && isDetailPath(to)) ||
        (isDetailPath(from) && isListPath(to))
      ) {
        return ['crossfade', 'shared-element']
      }

      // Detail -> Sub-page: slide forward
      if (isDetailPath(from) && isSubPage(to)) {
        return ['slide-forward']
      }

      // Sub-page -> Detail: slide back
      if (isSubPage(from) && isDetailPath(to)) {
        return ['slide-back']
      }

      // Auth pages: fast fade
      if (isAuth(from) || isAuth(to)) {
        return ['fade-fast']
      }

      // Everything else (main nav, authenticated space): fade + scale
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
