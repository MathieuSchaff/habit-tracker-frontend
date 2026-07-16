// Unmock react-router before any import that pulls in router internals; setup.ts mocks it globally.
import { vi } from 'vitest'

vi.unmock('@tanstack/react-router')

import { HAIRCARE_PRODUCT_TAG_TAXONOMY } from '@aurore/shared'

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

const HAIRCARE_ZERO_COUNT_LABEL = HAIRCARE_PRODUCT_TAG_TAXONOMY.pellicules.label

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

// The header trigger and the scroll-reveal floating button share the accessible
// name "Filtrer" (the FAB stays mounted off-screen in jsdom). Scope to the header
// trigger by its class so the query stays unambiguous.
async function openFilterDrawer(user: ReturnType<typeof userEvent.setup>) {
  const triggers = await screen.findAllByRole('button', { name: /Filtrer/i })
  const trigger = triggers.find((b) => b.classList.contains('list-filter-btn'))
  if (!trigger) throw new Error('header filter trigger not found')
  await user.click(trigger)
}

beforeEach(() => {
  // No logged-in user keeps dermo query disabled and profile toggle hidden.
  useAuthStore.setState({
    accessToken: null,
    tokenExpiresAt: null,
    user: null,
    emailVerified: false,
    role: 'user',
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
  it('applies a tag filter from the drawer and pushes it to the URL', async () => {
    const user = userEvent.setup()
    const { router } = renderProducts()
    await screen.findByText(/Hydrating Cleanser/)

    await openFilterDrawer(user)
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

  it('applies a composed skincare shortcut as canonical URL filters', async () => {
    server.use(
      http.get('*/api/products/filter-options', () =>
        HttpResponse.json({
          success: true,
          data: {
            ...PRODUCT_FILTER_OPTIONS,
            tagCounts: {
              ...PRODUCT_FILTER_OPTIONS.tagCounts,
              'type-hydratant': 1,
              'texture-creme': 1,
            },
          },
        })
      )
    )

    const user = userEvent.setup()
    const { router } = renderProducts()
    await screen.findByText(/Hydrating Cleanser/)

    await openFilterDrawer(user)
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /Je sais ce que je cherche/i }))
    await user.click(
      within(dialog).getByRole('button', {
        name: /Crème hydratante.*Hydratant \+ Crème/i,
      })
    )
    await user.click(within(dialog).getByRole('button', { name: /^Appliquer/i }))

    await waitFor(() => {
      expect(router.state.location.search).toMatchObject({
        product_type_v2: ['type-hydratant'],
        texture: ['texture-creme'],
      })
    })
  })

  it('resolves ingredient slugs from the URL into chips inside the drawer', async () => {
    const user = userEvent.setup()
    renderProducts([buildUrl('/products/', { ingredient: ['retinol', 'niacinamide'] })])

    await openFilterDrawer(user)
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

    await openFilterDrawer(user)
    const dialog = await screen.findByRole('dialog')

    // Ingredient is an inline single-control group (no accordion shell) — the
    // combobox renders flat, always visible, so there's nothing to expand.
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

  it('scopes ingredient search to the active domain tab', async () => {
    // Spy on the type param, then fall through to the default fixture handler.
    const searchTypes: (string | null)[] = []
    server.use(
      http.get('*/api/ingredients/search', ({ request }) => {
        searchTypes.push(new URL(request.url).searchParams.get('type'))
        return undefined
      })
    )

    const user = userEvent.setup()
    renderProducts()
    await screen.findByText(/Hydrating Cleanser/)

    await openFilterDrawer(user)
    const dialog = await screen.findByRole('dialog')

    const combo = within(dialog).getByRole('combobox', { name: /Ingrédient/i })
    await user.type(combo, 'ceramide')

    // Skincare tab: the haircare homonym must not leak into the dropdown.
    await within(dialog).findByRole('option', { name: 'Céramide NP' })
    expect(within(dialog).queryByRole('option', { name: 'Céramide 2' })).not.toBeInTheDocument()

    expect(searchTypes.length).toBeGreaterThan(0)
    expect(new Set(searchTypes)).toEqual(new Set(['skincare']))
  })

  it('hides skincare options with count=0', async () => {
    const user = userEvent.setup()
    renderProducts()
    await screen.findByText(/Hydrating Cleanser/)

    await openFilterDrawer(user)
    const dialog = await screen.findByRole('dialog')

    // No fixture product carries this slug, so the intent-first skincare drawer removes the noise.
    expect(within(dialog).queryByRole('button', { name: /^Rougeurs/i })).not.toBeInTheDocument()
  })

  it('renders chips with count=0 as disabled for a non-skincare domain', async () => {
    const user = userEvent.setup()
    // Non-skincare domains keep the generic drawer, which disables (not hides) zero-count chips.
    renderProducts([`/products/?category=${encodeURIComponent(JSON.stringify('haircare'))}`])
    await screen.findByText(/Hydrating Cleanser/)

    await openFilterDrawer(user)
    const dialog = await screen.findByRole('dialog')

    // No fixture product carries a haircare tag, so tagCounts=0 disables the chip.
    const chip = await within(dialog).findByRole('button', {
      name: new RegExp(`^${HAIRCARE_ZERO_COUNT_LABEL}`, 'i'),
    })
    expect(chip).toBeDisabled()
  })

  it('defers filter options to drawer open, then requeries per category on tab switch', async () => {
    // filter-options is off the cold-load waterfall (deferred to Filter intent), so it must
    // NOT fire at mount; opening the drawer fetches skincare, switching tab requeries haircare.
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
    expect(calls).not.toContain('skincare')

    await openFilterDrawer(user)
    await waitFor(() => {
      expect(calls).toContain('skincare')
    })

    // Drawer stays open across tab switch; category change requeries with haircare.
    await user.click(screen.getByRole('tab', { name: /Cheveux/i }))

    await waitFor(() => {
      expect(router.state.location.search).toMatchObject({ category: 'haircare' })
    })
    await waitFor(() => {
      expect(calls).toContain('haircare')
    })
  })
})

// Apply button reflects in-flight count, draft clears on close, and preview/main share the query key.
describe('ProductsPage — live preview count', () => {
  it('updates the apply button text live as the user toggles chips in the drawer', async () => {
    const user = userEvent.setup()
    renderProducts()
    await screen.findByText(/Hydrating Cleanser/)

    await openFilterDrawer(user)
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
    await openFilterDrawer(user)
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
    await openFilterDrawer(user)
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

    await openFilterDrawer(user)
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
      await openFilterDrawer(user)
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
