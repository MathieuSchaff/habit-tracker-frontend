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
      // 4 vitamins enable the top-3 cap test; 'vitamine c' (with space) still
      // uniquely matches "Vitamine C" since the others fold to 'vitamine e/a/b3'.
      queryFn: () =>
        Promise.resolve([
          { id: 1, slug: 'vitamine-c', name: 'Vitamine C' },
          { id: 2, slug: 'vitamine-e', name: 'Vitamine E' },
          { id: 3, slug: 'vitamine-a', name: 'Vitamine A' },
          { id: 4, slug: 'vitamine-b3', name: 'Vitamine B3' },
        ]),
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

  it('renders free-text fallback footer when query matches no facet (D3)', async () => {
    render(<ProductsHeader {...baseProps} />, { wrapper: makeWrapper() })
    const input = screen.getByRole('combobox', { name: /rechercher un produit/i })
    await userEvent.type(input, 'matifiant')
    // Fallback uses "résultats", facet entries use "produits" — the negative
    // assertion below excludes facet entries while the positive proves fallback ran.
    await waitFor(() =>
      expect(screen.getByText(/voir tous les résultats pour "matifiant"/i)).toBeInTheDocument()
    )
    expect(screen.queryByText(/voir tous les produits/i)).not.toBeInTheDocument()
  })

  it('renders fallback section alongside facet match (D4 multi-section)', async () => {
    render(<ProductsHeader {...baseProps} />, { wrapper: makeWrapper() })
    const input = screen.getByRole('combobox', { name: /rechercher un produit/i })
    await userEvent.type(input, 'vitamine c')
    await waitFor(() => screen.getByText(/voir tous les produits avec vitamine c/i))
    // D4 contract change vs D3: fallback is no longer mutex with facets — both
    // surface so the user can pick "see all by name+brand" even when an ingredient matched.
    expect(screen.getByText(/voir tous les résultats pour "vitamine c"/i)).toBeInTheDocument()
  })

  it('renders section header labels (D4)', async () => {
    render(<ProductsHeader {...baseProps} />, { wrapper: makeWrapper() })
    const input = screen.getByRole('combobox', { name: /rechercher un produit/i })
    await userEvent.type(input, 'vitamine c')
    await waitFor(() => screen.getByText('Ingrédients'))
    expect(screen.getByText('Recherche')).toBeInTheDocument()
    // Brand section is empty for "vitamine c" → must be filtered out (no header rendered).
    expect(screen.queryByText('Marques')).not.toBeInTheDocument()
  })

  it('caps ingredient section at FACET_SECTION_LIMIT (D4)', async () => {
    render(<ProductsHeader {...baseProps} />, { wrapper: makeWrapper() })
    const input = screen.getByRole('combobox', { name: /rechercher un produit/i })
    // 'vita' folds to substring of all 4 mocked vitamins → top 3 only.
    await userEvent.type(input, 'vita')
    await waitFor(() => screen.getByText('Ingrédients'))
    const entries = screen.getAllByText(/voir tous les produits avec vitamine/i)
    expect(entries).toHaveLength(3)
  })

  it('navigates to /products?q=… on fallback footer click (D3)', async () => {
    render(<ProductsHeader {...baseProps} />, { wrapper: makeWrapper() })
    const input = screen.getByRole('combobox', { name: /rechercher un produit/i })
    await userEvent.type(input, 'matifiant')
    const entry = await screen.findByText(/voir tous les résultats pour "matifiant"/i)
    await userEvent.click(entry)
    expect(navigate).toHaveBeenCalledOnce()
    const [call] = navigate.mock.calls
    expect(call[0].to).toBe('/products')
    const resolved = call[0].search({})
    expect(resolved).toMatchObject({ q: 'matifiant', page: 1 })
  })

  it('navigates to /products?q=… on Enter when fallback is the only footer entry (D3)', async () => {
    render(<ProductsHeader {...baseProps} />, { wrapper: makeWrapper() })
    const input = screen.getByRole('combobox', { name: /rechercher un produit/i })
    await userEvent.type(input, 'matifiant')
    await screen.findByText(/voir tous les résultats pour "matifiant"/i)
    await userEvent.keyboard('{Enter}')
    expect(navigate).toHaveBeenCalledOnce()
    const [call] = navigate.mock.calls
    expect(call[0].to).toBe('/products')
    const resolved = call[0].search({})
    expect(resolved).toMatchObject({ q: 'matifiant', page: 1 })
  })

  it('matches brand entry when typing without accents', async () => {
    render(<ProductsHeader {...baseProps} />, { wrapper: makeWrapper() })
    const input = screen.getByRole('combobox', { name: /rechercher un produit/i })
    await userEvent.type(input, 'avene')
    await waitFor(() => {
      expect(screen.getByText(/voir tous les produits avène/i)).toBeInTheDocument()
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

  it('navigates to /products?ingredient=… on Enter when ingredient match is the only footer entry', async () => {
    render(<ProductsHeader {...baseProps} />, { wrapper: makeWrapper() })
    const input = screen.getByRole('combobox', { name: /rechercher un produit/i })
    await userEvent.type(input, 'vitamine c')
    await screen.findByText(/voir tous les produits avec vitamine c/i)
    await userEvent.keyboard('{Enter}')
    expect(navigate).toHaveBeenCalledOnce()
    const [call] = navigate.mock.calls
    expect(call[0].to).toBe('/products')
    const resolved = call[0].search({})
    expect(resolved).toMatchObject({ ingredient: ['vitamine-c'], page: 1 })
  })
})
