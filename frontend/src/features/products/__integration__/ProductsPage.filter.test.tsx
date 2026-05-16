// Unmock react-router before any import that pulls in router internals; setup.ts mocks it globally.
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
import { HttpResponse, http } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { Route as ProductsIndexRouteImport } from '@/routes/products/index'
import { useAuthStore } from '@/store/auth'
import { PRODUCT_FILTER_OPTIONS } from '@/test/msw/fixtures/products'
import { server } from '@/test/msw/server'

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })
}

// Router serializes each key as JSON.stringify, so array filters land URL-encoded.
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
  // Re-attach the file route to a fresh root so the test picks its initial URL via memory history.
  const productsRoute = (
    ProductsIndexRouteImport as unknown as {
      update: (opts: object) => unknown
    }
  ).update({
    id: '/products/',
    path: '/products/',
    getParentRoute: () => rootRoute,
  })
  const routeTree = rootRoute.addChildren([productsRoute as never])
  const queryClient = makeClient()
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries }),
    defaultPendingMs: 0,
    context: {
      queryClient,
      auth: { isAuthenticated: false, accessToken: null },
    },
  })
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
  // No logged-in user keeps dermo query disabled and profile toggle hidden.
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
  // Drawer leaks scroll-lock styles on body between tests.
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

    const acneChip = await within(dialog).findByRole('button', { name: /Acné \/ Imperfections/i })
    await user.click(acneChip)
    await user.click(within(dialog).getByRole('button', { name: /^Appliquer/i }))

    await waitFor(() => {
      expect(router.state.location.search).toMatchObject({ concern: ['acne-imperfections'] })
    })
    await waitFor(() => {
      expect(screen.queryByText(/Hydrating Cleanser/)).not.toBeInTheDocument()
    })
    expect(screen.getByText(/Niacinamide 10% \+ Zinc 1%/)).toBeInTheDocument()
  })

  it('resolves ingredient slugs from the URL into chips inside the drawer', async () => {
    const user = userEvent.setup()
    renderProducts([buildUrl('/products/', { ingredient: ['retinol', 'niacinamide'] })])
    await screen.findByRole('button', { name: /Filtrer/i })

    await user.click(screen.getByRole('button', { name: /Filtrer/i }))
    const dialog = await screen.findByRole('dialog')

    // Accordion auto-opens groups with active selection. Resolve hits by-slugs and swaps to label.
    await waitFor(() => {
      expect(within(dialog).getByRole('button', { name: /Retirer Retinol/i })).toBeInTheDocument()
      expect(
        within(dialog).getByRole('button', { name: /Retirer Niacinamide/i })
      ).toBeInTheDocument()
    })
  })

  it('reset clears active filters from the URL', async () => {
    const user = userEvent.setup()
    const { router } = renderProducts([buildUrl('/products/', { concern: ['acne-imperfections'] })])
    await screen.findByText(/Niacinamide 10% \+ Zinc 1%/)
    expect(router.state.location.search).toMatchObject({ concern: ['acne-imperfections'] })

    await user.click(screen.getByRole('button', { name: /Retirer tous les filtres/i }))

    await waitFor(() => {
      expect(router.state.location.search).not.toHaveProperty('concern')
    })
    await waitFor(() => {
      expect(screen.getByText(/Hydrating Cleanser/)).toBeInTheDocument()
    })
  })

  it('async ingredient filter — type → click hit → apply pushes slug to URL', async () => {
    const user = userEvent.setup()
    const { router } = renderProducts()
    await screen.findByText(/Hydrating Cleanser/)

    await user.click(screen.getByRole('button', { name: /Filtrer/i }))
    const dialog = await screen.findByRole('dialog')

    // Ingredient accordion ships closed (defaultOpen: false); user must expand it.
    await user.click(within(dialog).getByText('Ingrédient', { selector: 'h3' }))

    const combo = within(dialog).getByRole('combobox', { name: /Ingrédient/i })
    await user.type(combo, 'nia')

    // Fixture has niacinamide + niacin-pca; pick the canonical.
    const niacinamide = await within(dialog).findByRole('option', { name: 'Niacinamide' })
    await user.click(niacinamide)

    await user.click(within(dialog).getByRole('button', { name: /^Appliquer/i }))

    await waitFor(() => {
      expect(router.state.location.search).toMatchObject({ ingredient: ['niacinamide'] })
    })
    await waitFor(() => {
      expect(screen.queryByText(/Hydrating Cleanser/)).not.toBeInTheDocument()
    })
    expect(screen.getByText(/Niacinamide 10% \+ Zinc 1%/)).toBeInTheDocument()
  })

  it('renders chips with count=0 as disabled and ignores click', async () => {
    const user = userEvent.setup()
    const { router } = renderProducts()
    await screen.findByText(/Hydrating Cleanser/)

    await user.click(screen.getByRole('button', { name: /Filtrer/i }))
    const dialog = await screen.findByRole('dialog')

    // No fixture product carries this slug, so tagCounts=0 disables the chip.
    const chip = await within(dialog).findByRole('button', { name: /Rougeurs vasculaires/i })
    expect(chip).toBeDisabled()

    await user.click(chip)
    expect(chip).toHaveAttribute('aria-pressed', 'false')

    await user.click(within(dialog).getByRole('button', { name: /^Appliquer/i }))
    await waitFor(() => {
      expect(router.state.location.search).not.toHaveProperty('concern')
    })
  })

  it('switching to the Cheveux tab re-fetches filter options for that category', async () => {
    // Tab switch must requery filter-options with category=haircare; mount also fires a skincare call.
    const calls: (string | null)[] = []
    server.use(
      http.get('*/api/products/filter-options', ({ request }) => {
        calls.push(new URL(request.url).searchParams.get('category'))
        return HttpResponse.json({ success: true, data: PRODUCT_FILTER_OPTIONS })
      })
    )

    const user = userEvent.setup()
    const { router } = renderProducts()
    await screen.findByText(/Hydrating Cleanser/)
    await waitFor(() => {
      expect(calls).toContain('skincare')
    })

    await user.click(screen.getByRole('tab', { name: /Cheveux/i }))

    await waitFor(() => {
      expect(router.state.location.search).toMatchObject({ category: 'haircare' })
    })
    await waitFor(() => {
      expect(calls).toContain('haircare')
    })
  })
})

// Live preview count (filter-drawer.md §6): apply button reflects in-flight count,
// draft clears on close, preview/main share queryKey on apply (cache hit).
describe('ProductsPage — live preview count (§6 of filter-drawer.md)', () => {
  it('updates the apply button text live as the user toggles chips in the drawer', async () => {
    const user = userEvent.setup()
    renderProducts()
    await screen.findByText(/Hydrating Cleanser/)

    await user.click(screen.getByRole('button', { name: /Filtrer/i }))
    const dialog = await screen.findByRole('dialog')
    const applyBtn = within(dialog).getByRole('button', {
      name: /Appliquer les filtres sélectionnés/i,
    })

    // No draft yet → preview equals main count (2 fixtures).
    await waitFor(() => {
      expect(applyBtn).toHaveTextContent(/Voir 2 produits/)
    })

    await user.click(within(dialog).getByRole('button', { name: /Acné \/ Imperfections/i }))

    // One fixture carries acne-imperfections → live count = 1.
    await waitFor(() => {
      expect(applyBtn).toHaveTextContent(/Voir 1 produit\b/)
    })

    // Toggling off restores the unfiltered count without re-apply.
    await user.click(within(dialog).getByRole('button', { name: /Acné \/ Imperfections/i }))
    await waitFor(() => {
      expect(applyBtn).toHaveTextContent(/Voir 2 produits/)
    })
  })

  it('does not echo a stale draft after the drawer is reopened', async () => {
    const user = userEvent.setup()
    renderProducts()
    await screen.findByText(/Hydrating Cleanser/)

    // Narrow → apply (URL set, draft cleared).
    await user.click(screen.getByRole('button', { name: /Filtrer/i }))
    let dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /Acné \/ Imperfections/i }))
    await waitFor(() => {
      expect(
        within(dialog).getByRole('button', { name: /Appliquer les filtres sélectionnés/i })
      ).toHaveTextContent(/Voir 1 produit\b/)
    })
    await user.click(
      within(dialog).getByRole('button', { name: /Appliquer les filtres sélectionnés/i })
    )
    await waitFor(() => {
      expect(screen.queryByText(/Hydrating Cleanser/)).not.toBeInTheDocument()
    })

    // Reopen: preview must reflect URL (1), not a stale draft. Regression breaks cache hit below.
    await user.click(screen.getByRole('button', { name: /Filtrer/i }))
    dialog = await screen.findByRole('dialog')
    await waitFor(() => {
      expect(
        within(dialog).getByRole('button', { name: /Appliquer les filtres sélectionnés/i })
      ).toHaveTextContent(/Voir 1 produit\b/)
    })
  })

  // Drawer must wipe its draft on domain switch; otherwise skincare draft bleeds into haircare.
  it('resyncs the drawer draft when the user switches domain tab while the drawer is open', async () => {
    const user = userEvent.setup()
    const { router } = renderProducts()
    await screen.findByText(/Hydrating Cleanser/)

    await user.click(screen.getByRole('button', { name: /Filtrer/i }))
    const dialog = await screen.findByRole('dialog')
    const applyBtn = within(dialog).getByRole('button', {
      name: /Appliquer les filtres sélectionnés/i,
    })

    await user.click(within(dialog).getByRole('button', { name: /Acné \/ Imperfections/i }))
    await waitFor(() => {
      expect(applyBtn).toHaveTextContent(/Voir 1 produit\b/)
    })

    // jsdom doesn't enforce showModal inertness; pins wiring (URL + draft resync), not modal behavior.
    await user.click(screen.getByRole('tab', { name: /Cheveux/i }))

    await waitFor(() => {
      expect(router.state.location.search).toMatchObject({ category: 'haircare' })
    })
    expect(router.state.location.search).not.toHaveProperty('concern')

    // Drawer stayed open; preview refetches with empty filters → unfiltered count (2 fixtures).
    await waitFor(() => {
      expect(applyBtn).toHaveTextContent(/Voir 2 produits/)
    })
  })

  it('reuses preview cache on apply — no extra fetch when keys converge', async () => {
    const user = userEvent.setup()
    renderProducts()
    await screen.findByText(/Hydrating Cleanser/)

    // Tally only acne-imperfections requests; remove listener in finally to avoid leakage.
    const filteredRequests: string[] = []
    const onRequest: Parameters<typeof server.events.on<'request:start'>>[1] = ({ request }) => {
      const u = request.url
      if (u.includes('/api/products') && u.includes('acne-imperfections')) {
        filteredRequests.push(u)
      }
    }
    server.events.on('request:start', onRequest)

    try {
      await user.click(screen.getByRole('button', { name: /Filtrer/i }))
      const dialog = await screen.findByRole('dialog')
      const applyBtn = within(dialog).getByRole('button', {
        name: /Appliquer les filtres sélectionnés/i,
      })

      await user.click(within(dialog).getByRole('button', { name: /Acné \/ Imperfections/i }))

      // Preview must land before apply; otherwise a race fires a second fetch and hides the cache hit.
      await waitFor(() => {
        expect(applyBtn).toHaveTextContent(/Voir 1 produit\b/)
      })
      expect(filteredRequests.length).toBe(1)

      await user.click(applyBtn)

      // Main grid query now points at the same key preview populated — should hit cache.
      await waitFor(() => {
        expect(screen.queryByText(/Hydrating Cleanser/)).not.toBeInTheDocument()
      })
      expect(screen.getByText(/Niacinamide 10% \+ Zinc 1%/)).toBeInTheDocument()
      expect(filteredRequests.length).toBe(1)
    } finally {
      server.events.removeListener('request:start', onRequest)
    }
  })
})
