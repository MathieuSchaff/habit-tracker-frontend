import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// IntersectionObserver is not available in jsdom; stub it so ComboboxPrimitive
// can register its sentinel without throwing.
if (!window.IntersectionObserver) {
  window.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })) as unknown as typeof IntersectionObserver
}

import { SearchCombobox, type SearchComboboxResult } from '../SearchCombobox'

// types & helpers

type TestItem = { id: number; slug: string; name: string }

const toResult = (item: TestItem): SearchComboboxResult => ({
  id: item.id,
  slug: item.slug,
  label: item.name,
})

// Returns a SearchCombobox-compatible queryFn. Each key in `handlers` is a
// query string; the matching handler is called when that query fires.
function makeQueryFn(handlers: Record<string, () => Promise<TestItem[]>> = {}) {
  return (q: string) => ({
    queryKey: ['test-search', q] as const,
    queryFn: async () => {
      const items = handlers[q] ? await handlers[q]() : []
      return { items, hasMore: false, nextOffset: 0 }
    },
    initialPageParam: 0,
    getNextPageParam: () => undefined,
  })
}

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

const ITEMS_AB: TestItem[] = [
  { id: 1, slug: 'item-a', name: 'Item A' },
  { id: 2, slug: 'item-b', name: 'Item B' },
]
const ITEMS_C: TestItem[] = [{ id: 3, slug: 'item-c', name: 'Item C' }]

// suites

describe('SearchCombobox — results', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows items once query reaches minChars', async () => {
    const queryFn = makeQueryFn({ ab: () => Promise.resolve(ITEMS_AB) })
    render(
      <SearchCombobox
        label="Search"
        queryFn={queryFn}
        toResult={toResult}
        onSelect={vi.fn()}
        debounce={0}
      />,
      { wrapper: makeWrapper() }
    )
    await userEvent.type(screen.getByRole('combobox'), 'ab')
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(2))
    expect(screen.getByRole('option', { name: 'Item A' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Item B' })).toBeInTheDocument()
  })

  it('calls onSelect with slug and full result on item click', async () => {
    const queryFn = makeQueryFn({ ab: () => Promise.resolve(ITEMS_AB) })
    const onSelect = vi.fn()
    render(
      <SearchCombobox
        label="Search"
        queryFn={queryFn}
        toResult={toResult}
        onSelect={onSelect}
        debounce={0}
      />,
      { wrapper: makeWrapper() }
    )
    await userEvent.type(screen.getByRole('combobox'), 'ab')
    await waitFor(() => screen.getByRole('option', { name: 'Item A' }))
    await userEvent.click(screen.getByRole('option', { name: 'Item A' }))
    expect(onSelect).toHaveBeenCalledWith('item-a', expect.objectContaining({ slug: 'item-a' }))
  })

  it('clears input and closes dropdown after selection', async () => {
    const queryFn = makeQueryFn({ ab: () => Promise.resolve(ITEMS_AB) })
    render(
      <SearchCombobox
        label="Search"
        queryFn={queryFn}
        toResult={toResult}
        onSelect={vi.fn()}
        debounce={0}
      />,
      { wrapper: makeWrapper() }
    )
    const input = screen.getByRole('combobox') as HTMLInputElement
    await userEvent.type(input, 'ab')
    await waitFor(() => screen.getByRole('option', { name: 'Item A' }))
    await userEvent.click(screen.getByRole('option', { name: 'Item A' }))
    expect(input.value).toBe('')
    expect(input).toHaveAttribute('aria-expanded', 'false')
  })
})

describe('SearchCombobox — loading states', () => {
  it('shows spinner on first fetch (no previous data)', async () => {
    let resolve!: (items: TestItem[]) => void
    const pending = new Promise<TestItem[]>((r) => {
      resolve = r
    })
    const queryFn = makeQueryFn({ ab: () => pending })
    render(
      <SearchCombobox
        label="Search"
        queryFn={queryFn}
        toResult={toResult}
        onSelect={vi.fn()}
        debounce={0}
      />,
      { wrapper: makeWrapper() }
    )
    await userEvent.type(screen.getByRole('combobox'), 'ab')
    // Spinner appears while first fetch is in flight
    await waitFor(() => expect(screen.getByText('Chargement...')).toBeInTheDocument())
    resolve([])
  })

  it('keeps previous items visible during re-fetch — no flash', async () => {
    let abcStarted = false
    let resolveC!: (items: TestItem[]) => void
    const pendingC = new Promise<TestItem[]>((r) => {
      resolveC = r
    })

    const queryFn = makeQueryFn({
      ab: () => Promise.resolve(ITEMS_AB),
      abc: () => {
        abcStarted = true
        return pendingC
      },
    })

    render(
      <SearchCombobox
        label="Search"
        queryFn={queryFn}
        toResult={toResult}
        onSelect={vi.fn()}
        debounce={0}
      />,
      { wrapper: makeWrapper() }
    )

    // First query: ab → results show
    await userEvent.type(screen.getByRole('combobox'), 'ab')
    await waitFor(() => screen.getByRole('option', { name: 'Item A' }))

    // Add 'c': triggers re-fetch for 'abc' (never resolves during this test)
    await userEvent.type(screen.getByRole('combobox'), 'c')

    // Wait until the 'abc' query has actually started (debounce fired, fetch called)
    await waitFor(() => expect(abcStarted).toBe(true))

    // Placeholder data: old items still visible, no spinner
    expect(screen.queryByText('Chargement...')).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Item A' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Item B' })).toBeInTheDocument()

    // Resolve 'abc' → new items replace old ones
    resolveC(ITEMS_C)
    await waitFor(() => screen.getByRole('option', { name: 'Item C' }))
    expect(screen.queryByRole('option', { name: 'Item A' })).not.toBeInTheDocument()
  })
})

describe('SearchCombobox — keyboard', () => {
  it('Escape closes the dropdown', async () => {
    const queryFn = makeQueryFn({ ab: () => Promise.resolve(ITEMS_AB) })
    render(
      <SearchCombobox
        label="Search"
        queryFn={queryFn}
        toResult={toResult}
        onSelect={vi.fn()}
        debounce={0}
      />,
      { wrapper: makeWrapper() }
    )
    const input = screen.getByRole('combobox')
    await userEvent.type(input, 'ab')
    await waitFor(() => screen.getByRole('option', { name: 'Item A' }))
    await userEvent.keyboard('{Escape}')
    expect(input).toHaveAttribute('aria-expanded', 'false')
  })

  it('Enter with no highlight calls onSubmitQuery with debounced query', async () => {
    const queryFn = makeQueryFn({ ab: () => Promise.resolve(ITEMS_AB) })
    const onSubmitQuery = vi.fn()
    render(
      <SearchCombobox
        label="Search"
        queryFn={queryFn}
        toResult={toResult}
        onSelect={vi.fn()}
        onSubmitQuery={onSubmitQuery}
        debounce={0}
      />,
      { wrapper: makeWrapper() }
    )
    await userEvent.type(screen.getByRole('combobox'), 'ab')
    await waitFor(() => screen.getByRole('option', { name: 'Item A' }))
    await userEvent.keyboard('{Enter}')
    expect(onSubmitQuery).toHaveBeenCalledWith('ab')
  })

  it('Enter with no highlight does nothing when onSubmitQuery is not provided', async () => {
    const queryFn = makeQueryFn({ ab: () => Promise.resolve(ITEMS_AB) })
    const onSelect = vi.fn()
    render(
      <SearchCombobox
        label="Search"
        queryFn={queryFn}
        toResult={toResult}
        onSelect={onSelect}
        debounce={0}
      />,
      { wrapper: makeWrapper() }
    )
    const input = screen.getByRole('combobox') as HTMLInputElement
    await userEvent.type(input, 'ab')
    await waitFor(() => screen.getByRole('option', { name: 'Item A' }))
    await userEvent.keyboard('{Enter}')
    expect(onSelect).not.toHaveBeenCalled()
    expect(input).toHaveAttribute('aria-expanded', 'true')
  })

  it('Enter with highlighted main item selects item, not section', async () => {
    const queryFn = makeQueryFn({ ab: () => Promise.resolve(ITEMS_AB) })
    const onSelect = vi.fn()
    const sectionSelect = vi.fn()
    render(
      <SearchCombobox
        label="Search"
        queryFn={queryFn}
        toResult={toResult}
        onSelect={onSelect}
        sections={() => [
          {
            id: 'extras',
            label: 'Extras',
            items: [{ id: 'extra', render: <span>Voir tous</span>, onSelect: sectionSelect }],
          },
        ]}
        debounce={0}
      />,
      { wrapper: makeWrapper() }
    )
    await userEvent.type(screen.getByRole('combobox'), 'ab')
    await waitFor(() => screen.getByRole('option', { name: 'Item A' }))
    // Section entry sits at idx 0 (rendered first); main items follow at 1, 2.
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}')
    expect(onSelect).toHaveBeenCalledWith('item-a', expect.objectContaining({ slug: 'item-a' }))
    expect(sectionSelect).not.toHaveBeenCalled()
  })

  it('ArrowDown + Enter selects the first item', async () => {
    const queryFn = makeQueryFn({ ab: () => Promise.resolve(ITEMS_AB) })
    const onSelect = vi.fn()
    render(
      <SearchCombobox
        label="Search"
        queryFn={queryFn}
        toResult={toResult}
        onSelect={onSelect}
        debounce={0}
      />,
      { wrapper: makeWrapper() }
    )
    await userEvent.type(screen.getByRole('combobox'), 'ab')
    await waitFor(() => screen.getByRole('option', { name: 'Item A' }))
    await userEvent.keyboard('{ArrowDown}{Enter}')
    expect(onSelect).toHaveBeenCalledWith('item-a', expect.objectContaining({ slug: 'item-a' }))
  })
})

describe('SearchCombobox — sections', () => {
  it('renders section header label and items', async () => {
    const queryFn = makeQueryFn({ ab: () => Promise.resolve(ITEMS_AB) })
    render(
      <SearchCombobox
        label="Search"
        queryFn={queryFn}
        toResult={toResult}
        onSelect={vi.fn()}
        sections={() => [
          {
            id: 'ingredients',
            label: 'Ingrédients',
            items: [{ id: 'i1', render: <span>Voir tous Vitamine C</span>, onSelect: vi.fn() }],
          },
        ]}
        debounce={0}
      />,
      { wrapper: makeWrapper() }
    )
    await userEvent.type(screen.getByRole('combobox'), 'ab')
    await waitFor(() => expect(screen.getByText('Ingrédients')).toBeInTheDocument())
    expect(screen.getByText('Voir tous Vitamine C')).toBeInTheDocument()
  })

  it('hides empty sections — visibleSections filter', async () => {
    const queryFn = makeQueryFn({ ab: () => Promise.resolve(ITEMS_AB) })
    render(
      <SearchCombobox
        label="Search"
        queryFn={queryFn}
        toResult={toResult}
        onSelect={vi.fn()}
        sections={() => [
          { id: 'empty', label: 'Empty section', items: [] },
          {
            id: 'has-items',
            label: 'Filled',
            items: [{ id: 'x', render: <span>Visible entry</span>, onSelect: vi.fn() }],
          },
        ]}
        debounce={0}
      />,
      { wrapper: makeWrapper() }
    )
    await userEvent.type(screen.getByRole('combobox'), 'ab')
    await waitFor(() => screen.getByText('Filled'))
    expect(screen.queryByText('Empty section')).not.toBeInTheDocument()
  })

  it('calls section item onSelect and closes on click', async () => {
    const queryFn = makeQueryFn({ ab: () => Promise.resolve(ITEMS_AB) })
    const sectionSelect = vi.fn()
    render(
      <SearchCombobox
        label="Search"
        queryFn={queryFn}
        toResult={toResult}
        onSelect={vi.fn()}
        sections={() => [
          {
            id: 'extras',
            label: 'Extras',
            items: [{ id: 'extra', render: <span>Voir tous</span>, onSelect: sectionSelect }],
          },
        ]}
        debounce={0}
      />,
      { wrapper: makeWrapper() }
    )
    const input = screen.getByRole('combobox') as HTMLInputElement
    await userEvent.type(input, 'ab')
    await waitFor(() => screen.getByText('Voir tous'))
    await userEvent.click(screen.getByText('Voir tous'))
    expect(sectionSelect).toHaveBeenCalledOnce()
    expect(input.value).toBe('')
    expect(input).toHaveAttribute('aria-expanded', 'false')
  })

  it('keyboard nav reaches section items first (sections rendered above results)', async () => {
    const queryFn = makeQueryFn({ ab: () => Promise.resolve(ITEMS_AB) })
    const sectionSelect = vi.fn()
    render(
      <SearchCombobox
        label="Search"
        queryFn={queryFn}
        toResult={toResult}
        onSelect={vi.fn()}
        sections={() => [
          {
            id: 'extras',
            label: 'Extras',
            items: [{ id: 'extra', render: <span>Section entry</span>, onSelect: sectionSelect }],
          },
        ]}
        debounce={0}
      />,
      { wrapper: makeWrapper() }
    )
    await userEvent.type(screen.getByRole('combobox'), 'ab')
    await waitFor(() => screen.getByRole('option', { name: 'Item A' }))
    // Section entry (idx 0) → ItemA (idx 1) → ItemB (idx 2)
    await userEvent.keyboard('{ArrowDown}{Enter}')
    expect(sectionSelect).toHaveBeenCalledOnce()
  })
})
