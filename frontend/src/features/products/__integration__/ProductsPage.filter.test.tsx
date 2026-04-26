// Integration test — full ProductsPage with real router + real query client.
// MUST unmock react-router before any import that pulls in router internals,
// otherwise the global mock from setup.ts neutralises useSearch/useNavigate.
import { vi } from 'vitest'
vi.unmock('@tanstack/react-router')

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { Route as ProductsIndexRouteImport } from '@/routes/products/index'
import { useAuthStore } from '@/store/auth'

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })
}

// TanStack Router's default search parser uses JSON.stringify per key, so an
// array filter lands in the URL as e.g. `?concern=%5B%22anti-acne%22%5D`.
function buildUrl(path: string, search: Record<string, string[]> = {}): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(search)) {
    params.set(key, JSON.stringify(value))
  }
  const qs = params.toString()
  return qs ? `${path}?${qs}` : path
}

function renderProducts(initialEntries: string[] = ['/products/']) {
  const rootRoute = createRootRoute()
  // Mirrors what routeTree.gen does: re-attach the file route to a fresh root
  // so the test owns the tree and can pick its initial URL via memory history.
  const productsRoute = (ProductsIndexRouteImport as unknown as {
    update: (opts: object) => unknown
  }).update({
    id: '/products/',
    path: '/products/',
    getParentRoute: () => rootRoute,
  })
  const routeTree = rootRoute.addChildren([productsRoute as never])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries }),
    defaultPendingMs: 0,
  })
  const queryClient = makeClient()
  return {
    router,
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    ),
  }
}

beforeEach(() => {
  // Default state — no logged-in user keeps the dermo query disabled and the
  // profile toggle hidden, so the test isn't perturbed by auth concerns.
  useAuthStore.setState({
    accessToken: null,
    tokenExpiresAt: null,
    user: null,
    emailVerified: false,
    role: 'user',
    isAdmin: false,
    isDemo: false,
    bootRefreshAttempted: false,
  })
})

afterEach(() => {
  // Drawer leaks scroll-lock styles on body if not unmounted cleanly between tests.
  document.body.style.overflow = ''
  document.body.style.position = ''
  document.body.style.width = ''
  document.body.style.top = ''
})

describe('ProductsPage — integration (URL ↔ filtres ↔ liste)', () => {
  it('mounts without filters and lists default products', async () => {
    renderProducts()
    expect(await screen.findByText(/Hydrating Cleanser/)).toBeInTheDocument()
    expect(screen.getByText(/Niacinamide 10% \+ Zinc 1%/)).toBeInTheDocument()
  })

  it('applies a tag filter from the drawer and pushes it to the URL', async () => {
    const user = userEvent.setup()
    const { router } = renderProducts()
    await screen.findByText(/Hydrating Cleanser/)

    await user.click(screen.getByRole('button', { name: /Filtrer/i }))
    const dialog = await screen.findByRole('dialog')

    const acneChip = await within(dialog).findByRole('button', { name: /Anti-acné/i })
    await user.click(acneChip)
    await user.click(within(dialog).getByRole('button', { name: /^Appliquer/i }))

    await waitFor(() => {
      expect(router.state.location.search).toMatchObject({ concern: ['anti-acne'] })
    })
    await waitFor(() => {
      expect(screen.queryByText(/Hydrating Cleanser/)).not.toBeInTheDocument()
    })
    expect(screen.getByText(/Niacinamide 10% \+ Zinc 1%/)).toBeInTheDocument()
  })

  it('resolves ingredient slugs from the URL into chips inside the drawer', async () => {
    const user = userEvent.setup()
    renderProducts([buildUrl('/products/', { ingredient: ['retinol', 'niacinamide'] })])
    // Wait for the page shell to mount (filter trigger reflects the active count).
    await screen.findByRole('button', { name: /Filtrer/i })

    await user.click(screen.getByRole('button', { name: /Filtrer/i }))
    const dialog = await screen.findByRole('dialog')

    // FilterAccordion auto-opens any group with active selection at mount, so
    // "Recherche précise" is already expanded — clicking would collapse it.
    // Resolve hits /api/ingredients/by-slugs and chips swap from raw slug to label.
    await waitFor(() => {
      expect(within(dialog).getByRole('button', { name: /Retirer Retinol/i })).toBeInTheDocument()
      expect(
        within(dialog).getByRole('button', { name: /Retirer Niacinamide/i })
      ).toBeInTheDocument()
    })
  })

  it('reset clears active filters from the URL', async () => {
    const user = userEvent.setup()
    const { router } = renderProducts([buildUrl('/products/', { concern: ['anti-acne'] })])
    await screen.findByText(/Niacinamide 10% \+ Zinc 1%/)
    expect(router.state.location.search).toMatchObject({ concern: ['anti-acne'] })

    // ActiveFiltersBar's clear button has aria-label "Retirer tous les filtres";
    // accessible name takes precedence over inner text in role queries.
    await user.click(screen.getByRole('button', { name: /Retirer tous les filtres/i }))

    await waitFor(() => {
      expect(router.state.location.search).not.toHaveProperty('concern')
    })
    await waitFor(() => {
      expect(screen.getByText(/Hydrating Cleanser/)).toBeInTheDocument()
    })
  })
})
