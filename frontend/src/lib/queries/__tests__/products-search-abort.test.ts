import { describe, expect, it, vi } from 'vitest'

// Every UI test stubs queryFn wholesale, so the real `{ init: { signal } }` wiring
// (cancel-in-flight on keystroke) would survive no test without these.
const { $get } = vi.hoisted(() => ({ $get: vi.fn() }))

vi.mock('@/lib/api', () => ({
  api: { products: { search: { $get } } },
}))

import { productQueries } from '../products'

function okResponse(data: unknown) {
  return { ok: true, status: 200, json: async () => ({ success: true, data }) }
}

describe('productQueries — AbortSignal forwarding', () => {
  it('search forwards the signal to the fetch init', async () => {
    const { signal } = new AbortController()
    $get.mockResolvedValue(okResponse({ items: [], hasMore: false, nextOffset: 0 }))

    const opts = productQueries.search('serum')
    await opts.queryFn?.({ pageParam: 0, signal } as never)

    expect($get).toHaveBeenCalledWith(
      { query: { q: 'serum', limit: '20', offset: '0' } },
      { init: { signal } }
    )
  })

  it('search paginates via pageParam as offset', async () => {
    const { signal } = new AbortController()
    $get.mockResolvedValue(okResponse({ items: [], hasMore: false, nextOffset: 40 }))

    const opts = productQueries.search('serum')
    await opts.queryFn?.({ pageParam: 20, signal } as never)

    expect($get).toHaveBeenCalledWith(
      { query: { q: 'serum', limit: '20', offset: '20' } },
      { init: { signal } }
    )
  })

  it('searchFlat forwards the signal to the fetch init', async () => {
    const { signal } = new AbortController()
    $get.mockResolvedValue(okResponse({ items: [], hasMore: false, nextOffset: 0 }))

    const opts = productQueries.searchFlat('serum')
    await opts.queryFn?.({ signal } as never)

    expect($get).toHaveBeenCalledWith(
      { query: { q: 'serum', limit: '20', offset: '0' } },
      { init: { signal } }
    )
  })
})
