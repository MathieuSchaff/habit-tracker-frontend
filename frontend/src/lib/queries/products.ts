import type {
  ApiResponse,
  CreateProductInput,
  Product,
  UpdateProductInput,
} from '@habit-tracker/shared'

import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '../api'

export type ListProductsFilters = {
  kind?: string | string[]
  brand?: string | string[]
  skin_type?: string | string[]
  skin_zone?: string | string[]
  product_type?: string | string[]
  concern?: string | string[]
  attribute?: string | string[]
  routine_step?: string | string[]
  ingredient?: string | string[]
  page?: number
  limit?: number
}
export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters: ListProductsFilters = {}) => [...productKeys.lists(), filters] as const,
  bySlug: (slug: string) => [...productKeys.all, slug] as const,
}

export const productQueries = {
  filterOptions: () =>
    queryOptions({
      queryKey: [...productKeys.all, 'filter-options'] as const,
      queryFn: async () => {
        const res = await api.products['filter-options'].$get()
        if (!res.ok) throw new Error('Failed to fetch filter options')
        const json = await res.json()
        return json.data
      },
      staleTime: 5 * 60 * 1000,
    }),

  list: (filters: ListProductsFilters = {}) =>
    queryOptions({
      queryKey: productKeys.list(filters),
      queryFn: async () => {
        const query: Record<string, string | string[]> = {}

        const addParam = (key: string, value: string | string[] | undefined) => {
          if (!value) return
          const arr = Array.isArray(value) ? value : [value]
          if (arr.length > 0) {
            query[key] = arr.join(',')
          }
        }

        addParam('kind', filters.kind)
        addParam('brand', filters.brand)
        addParam('skin_type', filters.skin_type)
        addParam('skin_zone', filters.skin_zone)
        addParam('product_type', filters.product_type)
        addParam('concern', filters.concern)
        addParam('attribute', filters.attribute)
        addParam('routine_step', filters.routine_step)
        addParam('ingredient', filters.ingredient)

        if (filters.page !== undefined) query.page = String(filters.page)
        if (filters.limit !== undefined) query.limit = String(filters.limit)

        const res = await api.products.$get({ query })
        if (!res.ok) throw new Error('Failed to fetch products')
        const json = await res.json()
        return json.data
      },
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
    }),

  bySlug: (slug: string) =>
    queryOptions({
      queryKey: productKeys.bySlug(slug),
      queryFn: async () => {
        const res = await api.products[':slug'].$get({ param: { slug } })
        const json = await res.json()
        if (!res.ok) throw new Error('product_not_found')
        return json.data
      },
      enabled: !!slug,
    }),

  search: (q: string) =>
    queryOptions({
      queryKey: [...productKeys.all, 'search', q] as const,
      queryFn: async () => {
        const res = await api.products.search.$get({ query: { q } })
        if (!res.ok) throw new Error('Failed to search products')
        const json = await res.json()
        return json.data
      },
      enabled: q.length >= 2,
      staleTime: 30 * 1000,
    }),
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateProductInput) => {
      const res = await api.products.$post({ json: data })
      const json = (await res.json()) as ApiResponse<Product>
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    onSuccess: (product) => {
      qc.setQueryData(productKeys.bySlug(product.slug), product)
      qc.invalidateQueries({ queryKey: productKeys.lists() })
    },
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateProductInput }) => {
      const res = await api.products[':id'].$patch({ param: { id }, json: data })
      const json = (await res.json()) as ApiResponse<Product>
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    onSuccess: (product) => {
      qc.setQueryData(productKeys.bySlug(product.slug), product)
      qc.invalidateQueries({ queryKey: productKeys.lists() })
    },
  })
}

export function useDeleteProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.products[':id'].$delete({ param: { id } })
      const json = (await res.json()) as ApiResponse<null>
      if (!json.success) throw new Error(json.error)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.lists() })
    },
  })
}

export function useProducts(filters: ListProductsFilters = {}) {
  return useQuery(productQueries.list(filters))
}
