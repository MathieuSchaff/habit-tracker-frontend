import type {
  CreateProductInput,
  ProductDomainTab,
  UpdateProductInput,
} from '@habit-tracker/shared'

import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '../api'

export type ProductSort = 'name' | 'random' | 'price_asc' | 'price_desc' | 'newest'

export type ListProductsFilters = {
  category?: ProductDomainTab
  kind?: string | string[]
  brand?: string | string[]
  skin_type?: string | string[]
  skin_zone?: string | string[]
  product_type?: string | string[]
  concern?: string | string[]
  skin_effect?: string | string[]
  product_label?: string | string[]
  shared_label?: string | string[]
  routine_step?: string | string[]
  ingredient?: string | string[]
  avoid_for?: string | string[]
  sort?: ProductSort
  priceMin?: number
  priceMax?: number
  page?: number
  limit?: number
}

// The list API accepts comma-separated strings, not real arrays, so arrays
// are joined before sending. Numeric params are stringified. Keys are omitted
// entirely when the corresponding filter is undefined / empty.
export function buildListProductsQuery(
  filters: ListProductsFilters
): Record<string, string | string[]> {
  const query: Record<string, string | string[]> = {}

  const addParam = (key: string, value: string | string[] | undefined) => {
    if (!value) return
    const arr = Array.isArray(value) ? value : [value]
    if (arr.length > 0) {
      query[key] = arr.join(',')
    }
  }

  if (filters.category !== undefined) query.category = filters.category

  addParam('kind', filters.kind)
  addParam('brand', filters.brand)
  addParam('skin_type', filters.skin_type)
  addParam('skin_zone', filters.skin_zone)
  addParam('product_type', filters.product_type)
  addParam('concern', filters.concern)
  addParam('skin_effect', filters.skin_effect)
  addParam('product_label', filters.product_label)
  addParam('shared_label', filters.shared_label)
  addParam('routine_step', filters.routine_step)
  addParam('ingredient', filters.ingredient)
  addParam('avoid_for', filters.avoid_for)

  if (filters.sort !== undefined) query.sort = filters.sort

  if (filters.priceMin !== undefined) query.priceMin = String(filters.priceMin)
  if (filters.priceMax !== undefined) query.priceMax = String(filters.priceMax)

  if (filters.page !== undefined) query.page = String(filters.page)
  if (filters.limit !== undefined) query.limit = String(filters.limit)

  return query
}

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters: ListProductsFilters = {}) => [...productKeys.lists(), filters] as const,
  bySlug: (slug: string) => [...productKeys.all, slug] as const,
  tags: (id: string) => [...productKeys.all, id, 'tags'] as const,
  ingredients: (id: string) => [...productKeys.all, id, 'ingredients'] as const,
}

export const productQueries = {
  filterOptions: (category?: ProductDomainTab) =>
    queryOptions({
      queryKey: [...productKeys.all, 'filter-options', category ?? 'all'] as const,
      queryFn: async () => {
        const query: Record<string, string> = {}
        if (category) query.category = category
        const res = await api.products['filter-options'].$get({ query })
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
        const query = buildListProductsQuery(filters)
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
        if (!res.ok) throw new Error('Failed to fetch product')
        const json = await res.json()
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

  checkDuplicate: (name: string, brand: string) =>
    queryOptions({
      queryKey: [...productKeys.all, 'check-duplicate', name, brand] as const,
      queryFn: async () => {
        const res = await api.products['check-duplicate'].$get({
          query: { name, brand },
        })
        if (!res.ok) throw new Error('Failed to check duplicate')
        const json = await res.json()
        return json.data
      },
      enabled: name.trim().length >= 2 && brand.trim().length >= 1,
      staleTime: 30 * 1000,
    }),

  brands: () =>
    queryOptions({
      queryKey: [...productKeys.all, 'brands'] as const,
      queryFn: async () => {
        const res = await api.products.brands.$get()
        if (!res.ok) throw new Error('Failed to fetch brands')
        const json = await res.json()
        return json.data as string[]
      },
      staleTime: 5 * 60 * 1000,
    }),

  tags: (id: string) =>
    queryOptions({
      queryKey: productKeys.tags(id),
      queryFn: async () => {
        const res = await api.products[':productId'].tags.$get({ param: { productId: id } })
        if (!res.ok) throw new Error('Failed to fetch product tags')
        const json = await res.json()
        return json.data
      },
      enabled: !!id,
    }),

  ingredients: (id: string) =>
    queryOptions({
      queryKey: productKeys.ingredients(id),
      queryFn: async () => {
        const res = await api.products[':productId'].ingredients.$get({
          param: { productId: id },
        })
        if (!res.ok) throw new Error('Failed to fetch product ingredients')
        const json = await res.json()
        return json.data
      },
      enabled: !!id,
    }),
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateProductInput) => {
      const res = await api.products.$post({ json: data })
      if (!res.ok) throw new Error('Failed to create product')
      const json = await res.json()
      if (!json.success) throw new Error('Failed to create product')
      return json.data
    },
    onSuccess: (product) => {
      qc.setQueryData(productKeys.bySlug(product.slug), product)
      qc.invalidateQueries({ queryKey: productKeys.lists() })
      qc.invalidateQueries({ queryKey: [...productKeys.all, 'brands'] })
    },
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateProductInput }) => {
      const res = await api.products[':id'].$patch({ param: { id }, json: data })
      if (!res.ok) throw new Error('Failed to update product')
      const json = await res.json()
      if (!json.success) throw new Error('Failed to update product')
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
      if (!res.ok) throw new Error('Failed to delete product')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.lists() })
    },
  })
}

export function useUpdateProductTags() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      productId,
      tags,
    }: {
      productId: string
      tags: { tagId: string; relevance: 'primary' | 'secondary' | 'avoid' }[]
    }) => {
      const res = await api.products[':productId'].tags.$put({
        param: { productId },
        json: { tags },
      })
      if (!res.ok) throw new Error('Failed to update product tags')
      const json = await res.json()
      if (!json.success) throw new Error('Failed to update product tags')
      return json.data
    },
    onSuccess: (_, { productId }) => {
      qc.invalidateQueries({ queryKey: productKeys.tags(productId) })
    },
  })
}

export function useAddProductIngredient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      productId,
      ingredientId,
    }: {
      productId: string
      ingredientId: string
    }) => {
      const res = await api.products[':productId'].ingredients.$post({
        param: { productId },
        json: { ingredientId },
      })
      if (!res.ok) throw new Error('Failed to add product ingredient')
      const json = await res.json()
      if (!json.success) throw new Error('Failed to add product ingredient')
      return json.data
    },
    onSuccess: (_, { productId }) => {
      qc.invalidateQueries({ queryKey: productKeys.ingredients(productId) })
    },
  })
}

export function useRemoveProductIngredient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      productId,
      ingredientId,
    }: {
      productId: string
      ingredientId: string
    }) => {
      const res = await api.products[':productId'].ingredients[':ingredientId'].$delete({
        param: { productId, ingredientId },
      })
      if (!res.ok) throw new Error('Failed to remove product ingredient')
    },
    onSuccess: (_, { productId }) => {
      qc.invalidateQueries({ queryKey: productKeys.ingredients(productId) })
    },
  })
}

export function useProducts(filters: ListProductsFilters = {}) {
  return useQuery(productQueries.list(filters))
}
