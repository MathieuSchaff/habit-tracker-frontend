import { api } from '../api'
import { ApiError } from '../helpers/apiError'

export const compatibilityKeys = {
  all: ['compatibility-scores'] as const,
  forProducts: (productIds: string[]) => [...compatibilityKeys.all, productIds.toSorted()] as const,
}

// Batch fetch of the user's empirical compatibility score per product, for the
// products currently in the collection. Keyed on the sorted id set so adding or
// removing a product (which shifts the underlying signal) refetches.
export const compatibilityScoresQuery = (productIds: string[]) => ({
  queryKey: compatibilityKeys.forProducts(productIds),
  queryFn: async () => {
    const res = await api.collection['compatibility-scores'].$post({ json: { productIds } })
    if (!res.ok) throw new ApiError('http_error', res.status)
    const data = await res.json()
    return data.data.scores
  },
  enabled: productIds.length > 0,
  staleTime: 5 * 60 * 1000,
})
