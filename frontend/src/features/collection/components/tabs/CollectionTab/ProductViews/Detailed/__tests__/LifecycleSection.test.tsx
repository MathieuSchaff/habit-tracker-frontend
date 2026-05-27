import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { LifecycleSection } from '../LifecycleSection'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    useQuery: vi.fn(() => ({ data: [] })),
  }
})

vi.mock('@/lib/queries/purchases', () => ({
  purchaseQueries: {
    byUserProduct: vi.fn(() => ({ queryKey: ['purchases'] })),
  },
  useOpenPurchase: vi.fn(() => ({ mutate: vi.fn() })),
  useFinishPurchase: vi.fn(() => ({ mutate: vi.fn() })),
}))

describe('LifecycleSection', () => {
  afterEach(() => {
    cleanup()
  })

  const defaultProps = {
    p: { id: 'up1' } as any,
    onAddPurchase: vi.fn(),
  }

  it('affiche un message si aucun achat disponible', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <LifecycleSection {...defaultProps} />
      </QueryClientProvider>
    )
    expect(screen.getByText(/Aucun achat enregistré/)).toBeInTheDocument()
  })
})
