import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const navigate = vi.fn()

// Hoisted spies: the focus-gate test asserts these are NOT called pre-focus.
const { brandsQueryFn, ingredientOptionsQueryFn } = vi.hoisted(() => ({
  // 3 'Bioderm*' brands enable the brand top-N cap test.
  brandsQueryFn: vi.fn(() =>
    Promise.resolve(['Avène', 'CeraVe', 'Bioderma', 'Biodermal', 'Bioderm Lab'])
  ),
  // 4 vitamins enable the top-N cap test; 'vitamine c' still matches uniquely after folding.
  ingredientOptionsQueryFn: vi.fn(() =>
    Promise.resolve([
      { id: 1, slug: 'vitamine-c', name: 'Vitamine C' },
      { id: 2, slug: 'vitamine-e', name: 'Vitamine E' },
      { id: 3, slug: 'vitamine-a', name: 'Vitamine A' },
      { id: 4, slug: 'vitamine-b3', name: 'Vitamine B3' },
    ])
  ),
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
  Link: vi.fn(({ children }: { children: ReactNode }) => children),
  createLink: vi.fn(() => vi.fn(({ children }: { children: ReactNode }) => children)),
  useRouter: vi.fn(() => ({ state: { location: { pathname: '/' } } })),
  useParams: vi.fn(() => ({})),
  useSearch: vi.fn(() => ({})),
}))

vi.mock('@/lib/queries/products', () => ({
  productQueries: {
    brands: vi.fn(() => ({
      queryKey: ['brands'],
      queryFn: brandsQueryFn,
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
      queryFn: ingredientOptionsQueryFn,
    })),
  },
}))

import { ingredientQueries } from '@/lib/queries/ingredients'
import { productQueries } from '@/lib/queries/products'
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
  hasQuery: false,
  onSortChange: vi.fn(),
  onOpenDrawer: vi.fn(),
  effectiveFilterCount: 0,
  activeTab: 'skincare' as const,
  onTabChange: vi.fn(),
  tabOptions: [
    { id: 'skincare' as const, label: 'Soin visage' },
    { id: 'haircare' as const, label: 'Cheveux' },
  ],
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
    // Fallback uses "résultats", facets use "produits"; negative assertion excludes facets.
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
    // D4: fallback and facets coexist so the user can still pick "see all by name+brand".
    expect(screen.getByText(/voir tous les résultats pour "vitamine c"/i)).toBeInTheDocument()
  })

  it('renders section header labels (D4)', async () => {
    render(<ProductsHeader {...baseProps} />, { wrapper: makeWrapper() })
    const input = screen.getByRole('combobox', { name: /rechercher un produit/i })
    await userEvent.type(input, 'vitamine c')
    await waitFor(() => screen.getByText('Ingrédients'))
    expect(screen.getByText('Recherche')).toBeInTheDocument()
    // Empty brand section must be filtered out (no header rendered).
    expect(screen.queryByText('Marques')).not.toBeInTheDocument()
  })

  it('caps ingredient section at FACET_SECTION_LIMIT (D4)', async () => {
    render(<ProductsHeader {...baseProps} />, { wrapper: makeWrapper() })
    const input = screen.getByRole('combobox', { name: /rechercher un produit/i })
    // 'vita' matches all 4 vitamins; cap limits to top 2.
    await userEvent.type(input, 'vita')
    await waitFor(() => screen.getByText('Ingrédients'))
    const entries = screen.getAllByText(/voir tous les produits avec vitamine/i)
    expect(entries).toHaveLength(2)
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
    // A fresh q must drop the sort carried by prev so the schema defaults to relevance.
    const resolved = call[0].search({ sort: 'newest' })
    expect(resolved).toMatchObject({ q: 'matifiant', page: 1 })
    expect(resolved.sort).toBeUndefined()
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
    const resolved = call[0].search({ sort: 'newest' })
    expect(resolved).toMatchObject({ q: 'matifiant', page: 1 })
    expect(resolved.sort).toBeUndefined()
  })

  it('matches brand entry when typing without accents', async () => {
    render(<ProductsHeader {...baseProps} />, { wrapper: makeWrapper() })
    const input = screen.getByRole('combobox', { name: /rechercher un produit/i })
    await userEvent.type(input, 'avene')
    await waitFor(() => {
      expect(screen.getByText(/voir tous les produits avène/i)).toBeInTheDocument()
    })
  })

  it('facet click drops a stale q from the URL (label promises "all products with X")', async () => {
    render(<ProductsHeader {...baseProps} />, { wrapper: makeWrapper() })
    const input = screen.getByRole('combobox', { name: /rechercher un produit/i })
    await userEvent.type(input, 'vitamine c')
    const entry = await screen.findByText(/voir tous les produits avec vitamine c/i)
    await userEvent.click(entry)
    const [call] = navigate.mock.calls
    const resolved = call[0].search({ q: 'serum' })
    expect(resolved).toMatchObject({ ingredient: ['vitamine-c'], page: 1 })
    expect(resolved.q).toBeUndefined()
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
    // search is a functional updater.
    const resolved = call[0].search({})
    expect(resolved).toMatchObject({ ingredient: ['vitamine-c'], page: 1 })
  })

  it('Enter applies typed text as q even when a facet section matches (sections require explicit selection)', async () => {
    render(<ProductsHeader {...baseProps} />, { wrapper: makeWrapper() })
    const input = screen.getByRole('combobox', { name: /rechercher un produit/i })
    await userEvent.type(input, 'vitamine c')
    await screen.findByText(/voir tous les produits avec vitamine c/i)
    await userEvent.keyboard('{Enter}')
    expect(navigate).toHaveBeenCalledOnce()
    const [call] = navigate.mock.calls
    expect(call[0].to).toBe('/products')
    const resolved = call[0].search({})
    expect(resolved).toMatchObject({ q: 'vitamine c', page: 1 })
    expect(resolved).not.toMatchObject({ ingredient: ['vitamine-c'] })
  })

  it('ArrowDown + Enter on an ingredient section entry navigates to /products?ingredient=…', async () => {
    render(<ProductsHeader {...baseProps} />, { wrapper: makeWrapper() })
    const input = screen.getByRole('combobox', { name: /rechercher un produit/i })
    await userEvent.type(input, 'vitamine c')
    await screen.findByText(/voir tous les produits avec vitamine c/i)
    // Sections render first; idx 0 = ingredient entry.
    await userEvent.keyboard('{ArrowDown}{Enter}')
    expect(navigate).toHaveBeenCalledOnce()
    const [call] = navigate.mock.calls
    expect(call[0].to).toBe('/products')
    const resolved = call[0].search({})
    expect(resolved).toMatchObject({ ingredient: ['vitamine-c'], page: 1 })
  })

  it('matches ingredient facet via slug when the display name does not match (INCI-style query)', async () => {
    render(<ProductsHeader {...baseProps} />, { wrapper: makeWrapper() })
    const input = screen.getByRole('combobox', { name: /rechercher un produit/i })
    // 'vitamine-c' is not a substring of the folded name 'vitamine c' — only the slug matches.
    await userEvent.type(input, 'vitamine-c')
    await waitFor(() => {
      expect(screen.getByText(/voir tous les produits avec vitamine c/i)).toBeInTheDocument()
    })
  })

  it('caps brand section at FACET_SECTION_LIMIT', async () => {
    render(<ProductsHeader {...baseProps} />, { wrapper: makeWrapper() })
    const input = screen.getByRole('combobox', { name: /rechercher un produit/i })
    // 'bioderm' matches 3 mocked brands; cap limits to top 2.
    await userEvent.type(input, 'bioderm')
    await waitFor(() => screen.getByText('Marques'))
    expect(screen.getAllByText(/voir tous les produits bioderm/i)).toHaveLength(2)
  })

  it('scopes facets and product search to the active domain tab', async () => {
    render(<ProductsHeader {...baseProps} activeTab="haircare" />, { wrapper: makeWrapper() })
    const input = screen.getByRole('combobox', { name: /rechercher un produit/i })
    await userEvent.type(input, 'keratine')

    expect(productQueries.brands).toHaveBeenCalledWith('haircare')
    expect(ingredientQueries.options).toHaveBeenCalledWith('haircare')
    await waitFor(() => expect(productQueries.search).toHaveBeenCalledWith('keratine', 'haircare'))
  })

  it('maps the complement tab to the supplement ingredient type', async () => {
    render(<ProductsHeader {...baseProps} activeTab="complement" />, { wrapper: makeWrapper() })
    await userEvent.click(screen.getByRole('combobox', { name: /rechercher un produit/i }))
    expect(ingredientQueries.options).toHaveBeenCalledWith('supplement')
  })

  it('does not fetch brands/ingredients before the input gains focus (LCP gate)', async () => {
    render(<ProductsHeader {...baseProps} />, { wrapper: makeWrapper() })
    expect(brandsQueryFn).not.toHaveBeenCalled()
    expect(ingredientOptionsQueryFn).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('combobox', { name: /rechercher un produit/i }))
    await waitFor(() => expect(brandsQueryFn).toHaveBeenCalled())
    expect(ingredientOptionsQueryFn).toHaveBeenCalled()
  })
})
