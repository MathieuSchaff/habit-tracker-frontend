import { queryOptions } from '@tanstack/react-query'

import { api } from '../api'
import { ApiError } from '../helpers/apiError'

const productTagKeys = {
  all: ['product-tags'] as const,
  lists: () => [...productTagKeys.all, 'list'] as const,
  list: (category?: string) => [...productTagKeys.lists(), { category }] as const,
}

export const productTagQueries = {
  list: (category?: string) =>
    queryOptions({
      queryKey: productTagKeys.list(category),
      queryFn: async () => {
        const res = await api['product-tags'].$get({ query: { category } })
        if (!res.ok) throw new ApiError('http_error', res.status)
        const json = await res.json()
        return json.data
      },
    }),
}
