import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const navigate = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
  Link: vi.fn(({ children }: { children: ReactNode }) => children),
  useRouter: vi.fn(() => ({ state: { location: { pathname: '/' } } })),
  useParams: vi.fn(() => ({})),
  useSearch: vi.fn(() => ({})),
}))

vi.mock('@/lib/queries/products', () => ({
  productQueries: {
    brands: vi.fn(() => ({
      queryKey: ['brands'],
      queryFn: () => Promise.resolve(['Avène', 'CeraVe']),
    })),
    search: vi.fn(() => ({
      queryKey: ['products', 'search'],
      queryFn: () => Promise.resolve({ items: [], hasMore: false, nextOffset: 0 }),
      initialPageParam: 0,
      getNextPageParam: () => undefined,
    })),
  },
}))

vi.mock('@/lib/queries/ingredients', () => ({
  ingredientQueries: {
    options: vi.fn(() => ({
      queryKey: ['ingredients-options'],
      queryFn: () =>
        Promise.resolve([{ id: 1, slug: 'vitamine-c', name: 'Vitamine C' }]),
    })),
  },
}))

import { ProductsHeader } from '../ProductsHeader'

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

const baseProps = {
  total: 0,
  hasFilters: false,
  isPlaceholderData: false,
  sort: 'name' as const,
  onSortChange: vi.fn(),
  onOpenDrawer: vi.fn(),
  effectiveFilterCount: 0,
}

describe('ProductsHeader — facet match footer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders brand footer entry on exact brand match', async () => {
    render(<ProductsHeader {...baseProps} />, { wrapper: makeWrapper() })
    const input = screen.getByRole('combobox', { name: /rechercher un produit/i })
    await userEvent.type(input, 'avène')
    await waitFor(() => {
      expect(screen.getByText(/voir tous les produits avène/i)).toBeInTheDocument()
    })
  })

  it('renders ingredient footer entry on exact ingredient match', async () => {
    render(<ProductsHeader {...baseProps} />, { wrapper: makeWrapper() })
    const input = screen.getByRole('combobox', { name: /rechercher un produit/i })
    await userEvent.type(input, 'vitamine c')
    await waitFor(() => {
      expect(screen.getByText(/voir tous les produits avec vitamine c/i)).toBeInTheDocument()
    })
  })

  it('renders no footer entry when query matches nothing', async () => {
    render(<ProductsHeader {...baseProps} />, { wrapper: makeWrapper() })
    const input = screen.getByRole('combobox', { name: /rechercher un produit/i })
    await userEvent.type(input, 'xyzqwerty')
    await waitFor(() => {
      expect(screen.queryByText(/voir tous les produits/i)).not.toBeInTheDocument()
    })
  })

  it('navigates to /products?ingredient=… on ingredient footer click', async () => {
    render(<ProductsHeader {...baseProps} />, { wrapper: makeWrapper() })
    const input = screen.getByRole('combobox', { name: /rechercher un produit/i })
    await userEvent.type(input, 'vitamine c')
    const entry = await screen.findByText(/voir tous les produits avec vitamine c/i)
    await userEvent.click(entry)
    expect(navigate).toHaveBeenCalledOnce()
    const [call] = navigate.mock.calls
    expect(call[0].to).toBe('/products')
    // search is a functional updater — verify it produces the expected shape
    const resolved = call[0].search({})
    expect(resolved).toMatchObject({ ingredient: ['vitamine-c'], page: 1 })
  })
})
