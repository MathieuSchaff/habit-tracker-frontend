import { queryOptions } from '@tanstack/react-query'

import { api } from '../api'

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
        if (!res.ok) throw new Error('Failed to fetch product tags')
        const json = await res.json()
        // useFormTags still expects legacy {name, category}; alias the new {label, tagType} fields.
        return json.data.map((t: (typeof json.data)[number]) => ({
          ...t,
          name: t.label,
          category: t.tagType,
        }))
      },
    }),
}
