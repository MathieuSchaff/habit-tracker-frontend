import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../api', () => ({
  api: {
    'product-comparisons': {
      ':id': {
        $patch: vi.fn(),
      },
    },
  },
}))

import { api } from '../../api'
import { useUpdateComparison } from '../comparisons'

const mockPatch = vi.mocked(api['product-comparisons'][':id'].$patch) as unknown as ReturnType<
  typeof vi.fn
>

function makeResponse(init: { status?: number; body: unknown }): Response {
  return new Response(JSON.stringify(init.body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

const ID = '11111111-1111-1111-1111-111111111111'
const ENRICHED = { id: ID, name: 'Renamed', createdAt: '2026-06-16T00:00:00.000Z', products: [] }

describe('useUpdateComparison', () => {
  let queryClient: QueryClient

  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    })
    mockPatch.mockReset()
  })

  afterEach(() => {
    queryClient.clear()
  })

  it('sends id as param + input as json, returns the enriched body', async () => {
    mockPatch.mockResolvedValue(makeResponse({ body: { success: true, data: ENRICHED } }))

    const { result } = renderHook(() => useUpdateComparison(), { wrapper })
    result.current.mutate({ id: ID, input: { name: 'Renamed' } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockPatch).toHaveBeenCalledWith({ param: { id: ID }, json: { name: 'Renamed' } })
    expect(result.current.data).toEqual(ENRICHED)
  })

  // The builder reads the authoritative GET, not the PATCH return value, so
  // this invalidation must stay wired or stale data lingers after an update.
  it('invalidates the detail and list queries on success', async () => {
    mockPatch.mockResolvedValue(makeResponse({ body: { success: true, data: ENRICHED } }))
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateComparison(), { wrapper })
    result.current.mutate({ id: ID, input: { name: 'Renamed' } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['product-comparisons', 'detail', ID],
    })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['product-comparisons', 'list'] })
  })

  it('throws when the response is not ok', async () => {
    mockPatch.mockResolvedValue(
      makeResponse({ status: 500, body: { success: false, error: 'server_error' } })
    )

    const { result } = renderHook(() => useUpdateComparison(), { wrapper })
    result.current.mutate({ id: ID, input: { name: 'Renamed' } })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(Error)
  })
})
