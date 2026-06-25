import { vi } from 'vitest'

// setup.ts mocks react-router (Link/createLink render children-only); lift it so ButtonLink renders a real <a>.
vi.unmock('@tanstack/react-router')

import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'

import { BackButton } from '../BackButton'

function renderInRouter(ui: ReactNode) {
  const rootRoute = createRootRoute()
  const startRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/start',
    component: () => <>{ui}</>,
  })
  const productsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/products',
    component: () => <div>Products page</div>,
  })
  const productSlugRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/products/$slug',
    component: () => <div>Product slug page</div>,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([startRoute, productsRoute, productSlugRoute]),
    history: createMemoryHistory({ initialEntries: ['/start'] }),
  })
  render(<RouterProvider router={router} />)
  return router
}

describe('BackButton', () => {
  // Regression: a `to` BackButton must be a navigable anchor, not an inert
  // <button>. Broke when Button dropped its `to`->Link branch (commit 8b18472a).
  it('renders `to` as a real link that navigates', async () => {
    const router = renderInRouter(<BackButton to="/products">Produits</BackButton>)
    const link = await screen.findByRole('link', { name: /produits/i })

    expect(link.tagName).toBe('A')
    expect(link).toHaveAttribute('href', '/products')

    await userEvent.click(link)
    await waitFor(() => expect(router.state.location.pathname).toBe('/products'))
    expect(screen.getByText('Products page')).toBeInTheDocument()
  })

  // Covers the dynamic callers (ProductEditPage, ThreadDetailPage) that pass `params`.
  it('resolves `params` into the link href', async () => {
    renderInRouter(
      <BackButton to="/products/$slug" params={{ slug: 'voile-de-nuit' }}>
        Produit
      </BackButton>
    )
    const link = await screen.findByRole('link', { name: /produit/i })
    expect(link).toHaveAttribute('href', '/products/voile-de-nuit')
  })

  it('renders `onClick` as a button that fires the handler', async () => {
    const onClick = vi.fn()
    renderInRouter(<BackButton onClick={onClick}>Annuler</BackButton>)
    const button = await screen.findByRole('button', { name: /annuler/i })

    await userEvent.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })
})
