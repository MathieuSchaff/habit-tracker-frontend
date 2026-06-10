import { QueryClient } from '@tanstack/react-query'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'

import { PRODUCTS } from '../../../test/msw/fixtures/products'
import { server } from '../../../test/msw/server'
import {
  applyShelfStatusOverlayToListCache,
  convergeShelfStatusForList,
  productQueries,
} from '../products'

type ListData = NonNullable<
  Awaited<ReturnType<NonNullable<ReturnType<typeof productQueries.list>['queryFn']>>>
>

const [A, B] = PRODUCTS

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

describe('convergeShelfStatusForList', () => {
  it('overlays a specific user-scoped list and reuses the shelf-status cache', async () => {
    const qc = makeClient()
    const items = PRODUCTS.map((p) => ({ ...p, userStatus: null })) as ListData['items']
    qc.setQueryData(productQueries.list({}, 'user-1').queryKey, {
      items,
      total: items.length,
      page: 1,
      limit: 20,
    })

    let overlayCalls = 0
    let fullListCalls = 0
    server.use(
      http.get('*/api/products/shelf-status', ({ request }) => {
        overlayCalls++
        const ids = new URL(request.url).searchParams.get('ids')
        expect(ids).toContain(A.id)
        expect(ids).toContain(B.id)
        return HttpResponse.json({
          success: true,
          data: [{ productId: B.id, userStatus: 'wishlist' }],
        })
      }),
      http.get('*/api/products', () => {
        fullListCalls++
        return HttpResponse.json({
          success: true,
          data: { items: [], total: 0, page: 1, limit: 20 },
        })
      })
    )

    await convergeShelfStatusForList(qc, {}, 'user-1')
    await convergeShelfStatusForList(qc, {}, 'user-1')

    expect(overlayCalls).toBe(1)
    expect(fullListCalls).toBe(0)
    const seeded = qc.getQueryData(productQueries.list({}, 'user-1').queryKey)
    expect(seeded?.items.find((i) => i.id === A.id)?.userStatus).toBeNull()
    expect(seeded?.items.find((i) => i.id === B.id)?.userStatus).toBe('wishlist')
  })

  it('leaves items outside the requested ids untouched', () => {
    const qc = makeClient()
    // C simulates an item added by a concurrent list refetch, absent from the overlay request.
    const C = { ...A, id: 'concurrent-refetch-id', userStatus: 'in_stock' }
    const items = [{ ...A, userStatus: null }, { ...B, userStatus: null }, C] as ListData['items']
    qc.setQueryData(productQueries.list({}, 'user-1').queryKey, {
      items,
      total: items.length,
      page: 1,
      limit: 20,
    })

    applyShelfStatusOverlayToListCache(
      qc,
      {},
      'user-1',
      new Set([A.id, B.id]),
      new Map([[A.id, 'wishlist' as const]])
    )

    const patched = qc.getQueryData(productQueries.list({}, 'user-1').queryKey)
    expect(patched?.items.find((i) => i.id === A.id)?.userStatus).toBe('wishlist')
    expect(patched?.items.find((i) => i.id === B.id)?.userStatus).toBeNull()
    // Not requested: its status must not be reset to null.
    expect(patched?.items.find((i) => i.id === C.id)?.userStatus).toBe('in_stock')
  })
})
