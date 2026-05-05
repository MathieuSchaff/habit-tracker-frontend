import type {
  AllProductTagCategory,
  CreateProductInput,
  ProductConcentrationUnit,
  ProductDomainTab,
  UpdateProductInput,
} from '@habit-tracker/shared'

import {
  infiniteQueryOptions,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { FILTER_KEYS } from '@/features/products/filters'
import { api } from '../api'

export type ProductSort = 'name' | 'random' | 'price_asc' | 'price_desc' | 'newest'

// Pre-serialization shape: arrays allowed (buildListProductsQuery converts to CSV).
// Kept local (not shared discriminated union) because Hono RPC expects Record<string,string>.
export type ListProductsFilters = {
  category?: ProductDomainTab
  kind?: string | string[]
  brand?: string | string[]
  ingredient?: string | string[]
  avoid_for?: string | string[]
  q?: string
  sort?: ProductSort
  priceMin?: number
  priceMax?: number
  page?: number
  limit?: number
} & { [K in AllProductTagCategory]?: string | string[] }

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

  // Tag categories + brand/ingredient/kind share the same array-CSV serialization.
  // avoid_for is profile-derived (not a user filter), kept separate.
  const f = filters as Record<string, string | string[] | undefined>
  for (const key of FILTER_KEYS) addParam(key, f[key])
  addParam('avoid_for', filters.avoid_for)

  if (filters.q !== undefined) query.q = filters.q
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
        // Hono RPC types the query as a Zod discriminated union on `category`.
        // buildListProductsQuery returns a stringified record that the backend
        // validator accepts at runtime; the cast bridges that shape gap.
        const query = buildListProductsQuery(filters) as Parameters<
          typeof api.products.$get
        >[0]['query']
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
    infiniteQueryOptions({
      queryKey: [...productKeys.all, 'search', q] as const,
      queryFn: async ({ pageParam }: { pageParam: number }) => {
        const res = await api.products.search.$get({
          query: { q, limit: '20', offset: String(pageParam) },
        })
        if (!res.ok) throw new Error('Failed to search products')
        const json = await res.json()
        return json.data
      },
      initialPageParam: 0 as number,
      getNextPageParam: (lastPage): number | undefined =>
        lastPage.hasMore ? lastPage.nextOffset : undefined,
      enabled: q.length >= 2,
      staleTime: 30 * 1000,
    }),

  // Flat (non-infinite) variant for AsyncSearchSelect: one page is plenty for
  // a typeahead, and the consumer needs queryOptions, not infiniteQueryOptions.
  searchFlat: (q: string) =>
    queryOptions({
      queryKey: [...productKeys.all, 'search-flat', q] as const,
      queryFn: async () => {
        const res = await api.products.search.$get({ query: { q, limit: '20', offset: '0' } })
        if (!res.ok) throw new Error('Failed to search products')
        const json = await res.json()
        return json.data.items
      },
      enabled: q.length >= 2,
      staleTime: 30 * 1000,
    }),

  byIds: (ids: string[]) =>
    queryOptions({
      queryKey: [...productKeys.all, 'by-ids', [...ids].sort().join(',')] as const,
      queryFn: async () => {
        const res = await api.products['by-ids'].$get({ query: { ids: ids.join(',') } })
        if (!res.ok) throw new Error('Failed to fetch products by ids')
        const json = await res.json()
        return json.data
      },
      enabled: ids.length > 0,
      staleTime: 5 * 60 * 1000,
    }),

  checkDuplicate: (name: string, brand: string) => {
    // Normalize so case/whitespace variants share a single cache entry —
    // server already matches case-insensitively.
    const n = name.trim().toLowerCase()
    const b = brand.trim().toLowerCase()
    return queryOptions({
      queryKey: [...productKeys.all, 'check-duplicate', n, b] as const,
      queryFn: async () => {
        const res = await api.products['check-duplicate'].$get({
          query: { name: n, brand: b },
        })
        if (!res.ok) throw new Error('Failed to check duplicate')
        const json = await res.json()
        return json.data
      },
      enabled: n.length >= 2 && b.length >= 1,
      staleTime: 30 * 1000,
    })
  },

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
    mutationFn: async ({ id }: { id: string; slug: string }) => {
      const res = await api.products[':id'].$delete({ param: { id } })
      if (!res.ok) throw new Error('Failed to delete product')
    },
    onSuccess: (_, { slug }) => {
      qc.removeQueries({ queryKey: productKeys.bySlug(slug) })
      qc.invalidateQueries({ queryKey: productKeys.lists() })
      qc.invalidateQueries({ queryKey: [...productKeys.all, 'brands'] })
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
      slug: string
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
    onSuccess: (_, { slug }) => {
      qc.invalidateQueries({ queryKey: productKeys.bySlug(slug) })
      qc.invalidateQueries({ queryKey: productKeys.lists() })
    },
  })
}

export function useAddProductIngredient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      productId,
      ingredientId,
      concentrationValue,
      concentrationUnit,
    }: {
      productId: string
      slug: string
      ingredientId: string
      concentrationValue?: number
      concentrationUnit?: ProductConcentrationUnit
    }) => {
      const res = await api.products[':productId'].ingredients.$post({
        param: { productId },
        json: {
          ingredientId,
          concentrationValue,
          concentrationUnit,
        },
      })
      if (!res.ok) throw new Error('Failed to add product ingredient')
      const json = await res.json()
      if (!json.success) throw new Error('Failed to add product ingredient')
      return json.data
    },
    onSuccess: (_, { productId, slug }) => {
      qc.invalidateQueries({ queryKey: productKeys.ingredients(productId) })
      qc.invalidateQueries({ queryKey: productKeys.bySlug(slug) })
    },
  })
}

export function useUpdateProductIngredient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      productId,
      ingredientId,
      concentrationValue,
      concentrationUnit,
    }: {
      productId: string
      slug: string
      ingredientId: string
      concentrationValue?: number | null
      concentrationUnit?: ProductConcentrationUnit | null
    }) => {
      const res = await api.products[':productId'].ingredients[':ingredientId'].$patch({
        param: { productId, ingredientId },
        json: {
          concentrationValue,
          concentrationUnit,
        },
      })
      if (!res.ok) throw new Error('Failed to update product ingredient')
      const json = await res.json()
      if (!json.success) throw new Error('Failed to update product ingredient')
      return json.data
    },
    onSuccess: (_, { productId, slug }) => {
      qc.invalidateQueries({ queryKey: productKeys.ingredients(productId) })
      qc.invalidateQueries({ queryKey: productKeys.bySlug(slug) })
    },
  })
}

type BySlugData = {
  ingredients: Array<{ ingredientId: string }>
} & Record<string, unknown>

export function useRemoveProductIngredient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      productId,
      ingredientId,
    }: {
      productId: string
      slug: string
      ingredientId: string
    }) => {
      const res = await api.products[':productId'].ingredients[':ingredientId'].$delete({
        param: { productId, ingredientId },
      })
      if (!res.ok) throw new Error('Failed to remove product ingredient')
    },
    // Optimistic remove: drop the row immediately so unrelated rows stay interactive.
    onMutate: async ({ slug, ingredientId }) => {
      await qc.cancelQueries({ queryKey: productKeys.bySlug(slug) })
      const previous = qc.getQueryData<BySlugData>(productKeys.bySlug(slug))
      if (previous) {
        qc.setQueryData<BySlugData>(productKeys.bySlug(slug), {
          ...previous,
          ingredients: previous.ingredients.filter((i) => i.ingredientId !== ingredientId),
        })
      }
      return { previous }
    },
    onError: (_err, { slug }, ctx) => {
      if (ctx?.previous) qc.setQueryData(productKeys.bySlug(slug), ctx.previous)
    },
    onSettled: (_, __, { productId, slug }) => {
      qc.invalidateQueries({ queryKey: productKeys.ingredients(productId) })
      qc.invalidateQueries({ queryKey: productKeys.bySlug(slug) })
    },
  })
}

export function useProducts(filters: ListProductsFilters = {}) {
  return useQuery(productQueries.list(filters))
}

export type ProductListItem = NonNullable<ReturnType<typeof useProducts>['data']>['items'][number]
