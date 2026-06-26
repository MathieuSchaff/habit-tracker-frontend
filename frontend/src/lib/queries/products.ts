import type {
  AllProductTagCategory,
  CreateProductInput,
  ProductConcentrationUnit,
  ProductDomainTab,
  ProductFormulaPreviewInput,
  ProductSort,
  UpdateProductInput,
  UserProductStatus,
} from '@aurore/shared'

export type { ProductSort }

import {
  infiniteQueryOptions,
  type QueryClient,
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'

import { FILTER_KEYS } from '@/features/products/filters'
import { type ApiData, api } from '../api'
import { ApiError, throwIfNotOk } from '../helpers/apiError'
import { applyOptimisticUpdates, optimisticCacheUpdate } from './optimistic'

// Pre-serialization shape; local because Hono RPC expects Record<string,string>.
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

  // avoid_for is profile-derived, not a user-driven tag category.
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

function normalizeShelfStatusIds(ids: readonly string[]): string[] {
  return [...new Set(ids)].toSorted()
}

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters: ListProductsFilters = {}) => [...productKeys.lists(), filters] as const,
  shelfStatuses: () => [...productKeys.all, 'shelf-status'] as const,
  shelfStatus: (userId: string | null, ids: readonly string[]) =>
    [...productKeys.shelfStatuses(), userId, normalizeShelfStatusIds(ids).join(',')] as const,
  bySlug: (slug: string) => [...productKeys.all, slug] as const,
  ingredients: (id: string) => [...productKeys.all, id, 'ingredients'] as const,
  publicReviews: (slug: string) => [...productKeys.all, slug, 'reviews', 'public'] as const,
  posts: (slug: string) => [...productKeys.all, slug, 'posts'] as const,
}

export const productQueries = {
  filterOptions: (category?: ProductDomainTab) =>
    queryOptions({
      queryKey: [...productKeys.all, 'filter-options', category ?? 'all'] as const,
      queryFn: async () => {
        const query: Record<string, string> = {}
        if (category) query.category = category
        const res = await api.products['filter-options'].$get({ query })
        if (!res.ok) throw new ApiError('http_error', res.status)
        const json = await res.json()
        return json.data
      },
      staleTime: 5 * 60 * 1000,
    }),

  // userKey gives each user their own cached list, so login/logout swaps in the right
  // personalized fields (shelf status) instead of showing the previous user's.
  list: (filters: ListProductsFilters = {}, userKey: string | null = null) =>
    queryOptions({
      queryKey: [...productKeys.list(filters), userKey] as const,
      queryFn: async () => {
        // Cast: Hono RPC's Zod union vs. our stringified record; accepted at runtime.
        const query = buildListProductsQuery(filters) as Parameters<
          typeof api.products.$get
        >[0]['query']
        const res = await api.products.$get({ query })
        // throwIfNotOk (not `if (!res.ok)`) to keep the backend code+retryAfter on the
        // ApiError so a 429 surfaces "retry in Ns"; re-narrow the union after.
        await throwIfNotOk(res)
        const json = await res.json()
        if (!json.success) throw new ApiError('http_error', res.status)
        return json.data
      },
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
    }),

  shelfStatus: (userId: string | null, ids: readonly string[]) =>
    queryOptions({
      queryKey: productKeys.shelfStatus(userId, ids),
      queryFn: () => fetchShelfStatus(normalizeShelfStatusIds(ids)),
      enabled: !!userId && ids.length > 0,
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
    }),

  bySlug: (slug: string) =>
    queryOptions({
      queryKey: productKeys.bySlug(slug),
      queryFn: async () => {
        const res = await api.products[':slug'].$get({ param: { slug } })
        if (!res.ok) throw new ApiError('http_error', res.status)
        const json = await res.json()
        return json.data
      },
      enabled: !!slug,
      staleTime: 5 * 60 * 1000,
    }),

  publicReviews: (slug: string) =>
    queryOptions({
      queryKey: productKeys.publicReviews(slug),
      queryFn: async () => {
        const res = await api.products[':slug'].reviews.public.$get({ param: { slug } })
        if (!res.ok) throw new ApiError('http_error', res.status)
        const json = await res.json()
        return json.data
      },
      enabled: !!slug,
      staleTime: 60 * 1000,
    }),

  posts: (slug: string) =>
    queryOptions({
      queryKey: productKeys.posts(slug),
      queryFn: async () => {
        const res = await api.products[':slug'].posts.$get({ param: { slug } })
        if (!res.ok) throw new ApiError('http_error', res.status)
        const json = await res.json()
        return json.data
      },
      enabled: !!slug,
      staleTime: 60 * 1000,
    }),

  // Personalized when authed (optional bearer), so userKey separates anon vs. per-user cache.
  dermoScore: (slug: string, userKey: string | null = null) =>
    queryOptions({
      queryKey: [...productKeys.bySlug(slug), 'dermo-score', userKey] as const,
      queryFn: async () => {
        const res = await api.products[':slug']['dermo-score'].$get({ param: { slug } })
        if (!res.ok) throw new ApiError('http_error', res.status)
        const json = await res.json()
        return json.data
      },
      enabled: !!slug,
      staleTime: 5 * 60 * 1000,
    }),

  search: (q: string) =>
    infiniteQueryOptions({
      queryKey: [...productKeys.all, 'search', q] as const,
      queryFn: async ({ pageParam, signal }: { pageParam: number; signal: AbortSignal }) => {
        const res = await api.products.search.$get(
          { query: { q, limit: '20', offset: String(pageParam) } },
          { init: { signal } }
        )
        await throwIfNotOk(res)
        const json = await res.json()
        if (!json.success) throw new ApiError('http_error', res.status)
        return json.data
      },
      initialPageParam: 0 as number,
      getNextPageParam: (lastPage): number | undefined =>
        lastPage.hasMore ? lastPage.nextOffset : undefined,
      enabled: q.length >= 2,
      staleTime: 30 * 1000,
    }),

  // Flat (non-paginated) variant for AsyncSearchSelect typeahead.
  searchFlat: (q: string) =>
    queryOptions({
      queryKey: [...productKeys.all, 'search-flat', q] as const,
      queryFn: async ({ signal }) => {
        const res = await api.products.search.$get(
          { query: { q, limit: '20', offset: '0' } },
          { init: { signal } }
        )
        await throwIfNotOk(res)
        const json = await res.json()
        if (!json.success) throw new ApiError('http_error', res.status)
        return json.data.items
      },
      enabled: q.length >= 2,
      staleTime: 30 * 1000,
    }),

  byIds: (ids: string[]) =>
    queryOptions({
      queryKey: [...productKeys.all, 'by-ids', ids.toSorted().join(',')] as const,
      queryFn: async () => {
        const res = await api.products['by-ids'].$get({ query: { ids: ids.join(',') } })
        if (!res.ok) throw new ApiError('http_error', res.status)
        const json = await res.json()
        return json.data
      },
      enabled: ids.length > 0,
      staleTime: 5 * 60 * 1000,
    }),

  checkDuplicate: (name: string, brand: string) => {
    // Normalize so case/whitespace variants share one cache entry.
    const n = name.trim().toLowerCase()
    const b = brand.trim().toLowerCase()
    return queryOptions({
      queryKey: [...productKeys.all, 'check-duplicate', n, b] as const,
      queryFn: async () => {
        const res = await api.products['check-duplicate'].$get({
          query: { name: n, brand: b },
        })
        if (!res.ok) throw new ApiError('http_error', res.status)
        const json = await res.json()
        return json.data
      },
      enabled: n.length >= 2 && b.length >= 1,
      staleTime: 30 * 1000,
    })
  },

  previewSlug: (name: string, brand: string) => {
    const n = name.trim().toLowerCase()
    const b = brand.trim().toLowerCase()
    return queryOptions({
      queryKey: [...productKeys.all, 'slug-preview', n, b] as const,
      queryFn: async () => {
        const res = await api.products['slug-preview'].$get({ query: { name: n, brand: b } })
        if (!res.ok) throw new ApiError('http_error', res.status)
        const json = await res.json()
        if (!json.success) throw new Error('slug preview failed')
        return json.data.slug
      },
      staleTime: 30 * 1000,
    })
  },

  brands: () =>
    queryOptions({
      queryKey: [...productKeys.all, 'brands'] as const,
      queryFn: async () => {
        const res = await api.products.brands.$get()
        if (!res.ok) throw new ApiError('http_error', res.status)
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
        if (!res.ok) throw new ApiError('http_error', res.status)
        const json = await res.json()
        return json.data
      },
      enabled: !!id,
    }),
}

type ProductListData = NonNullable<
  Awaited<ReturnType<NonNullable<ReturnType<typeof productQueries.list>['queryFn']>>>
>

async function fetchShelfStatus(ids: string[]): Promise<Map<string, UserProductStatus>> {
  const byId = new Map<string, UserProductStatus>()
  const chunks: string[][] = []
  // Chunk to the endpoint's id cap (100); a normal page fits in one request.
  for (let i = 0; i < ids.length; i += 100) {
    chunks.push(ids.slice(i, i + 100))
  }
  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const res = await api.products['shelf-status'].$get({
        query: { ids: chunk.join(',') },
      })
      if (!res.ok) throw new ApiError('http_error', res.status)
      const json = await res.json()
      return json.data
    })
  )
  for (const rows of results) {
    for (const row of rows) {
      byId.set(row.productId, row.userStatus)
    }
  }
  return byId
}

// Only items in requestedIds are patched: the map's absence means "no status" for a
// requested id, but says nothing about ids fetched by a concurrent list refetch.
function applyShelfStatusOverlay(
  listData: ProductListData,
  requestedIds: ReadonlySet<string>,
  statusByProductId: ReadonlyMap<string, UserProductStatus>
): ProductListData {
  let changed = false
  const items = listData.items.map((item) => {
    if (!requestedIds.has(item.id)) return item
    const nextStatus = statusByProductId.get(item.id) ?? null
    if (item.userStatus === nextStatus) return item
    changed = true
    return { ...item, userStatus: nextStatus }
  })

  return changed ? { ...listData, items } : listData
}

export function applyShelfStatusOverlayToListCache(
  qc: QueryClient,
  filters: ListProductsFilters,
  userKey: string,
  requestedIds: ReadonlySet<string>,
  statusByProductId: ReadonlyMap<string, UserProductStatus>
): void {
  qc.setQueryData<ProductListData>(productQueries.list(filters, userKey).queryKey, (current) => {
    if (!current) return current
    return applyShelfStatusOverlay(current, requestedIds, statusByProductId)
  })
}

// Ensures one product list has a shelf-status overlay. The list fetch is the normal
// catalogue fetch for that navigation; the overlay only reads statuses for its ids.
export async function convergeShelfStatusForList(
  qc: QueryClient,
  filters: ListProductsFilters,
  userId: string,
  userKey: string = userId
): Promise<void> {
  try {
    const listData = await qc.ensureQueryData(productQueries.list(filters, userKey))
    const productIds = listData.items.map((item) => item.id)
    if (productIds.length === 0) return

    const statusByProductId = await qc.ensureQueryData(
      productQueries.shelfStatus(userId, productIds)
    )
    applyShelfStatusOverlayToListCache(qc, filters, userKey, new Set(productIds), statusByProductId)
  } catch {
    // Best-effort: the catalogue remains usable; later navigation/refetch can retry the overlay.
  }
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateProductInput) => {
      const res = await api.products.$post({ json: data })
      await throwIfNotOk(res, 'product_creation_failed')
      const json = await res.json()
      if (!json.success) throw new ApiError('product_creation_failed', res.status)
      return json.data
    },
    onSuccess: () => {
      // Don't seed bySlug: POST returns row only; cache holds full ProductDetail with tags/ingredients.
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
      await throwIfNotOk(res, 'product_update_failed')
      const json = await res.json()
      if (!json.success) throw new ApiError('product_update_failed', res.status)
      return json.data
    },
    onSuccess: (product) => {
      // Invalidate (not setQueryData): PATCH returns row only; bySlug cache holds full ProductDetail.
      qc.invalidateQueries({ queryKey: productKeys.bySlug(product.slug) })
      qc.invalidateQueries({ queryKey: productKeys.lists() })
    },
    meta: { errorMessage: 'Modification du produit impossible.' },
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
    meta: { errorMessage: 'Suppression du produit impossible.' },
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
    meta: { errorMessage: 'Mise à jour des tags impossible.' },
  })
}

export function useAddProductIngredient() {
  const qc = useQueryClient()
  return useMutation({
    // Keyed so FormulaPreview can observe in-flight adds via useMutationState.
    mutationKey: ['add-product-ingredient'],
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
    meta: { errorMessage: "Ajout de l'ingrédient impossible." },
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
    meta: { errorMessage: "Mise à jour de l'ingrédient impossible." },
  })
}

type BySlugData = {
  ingredients: Array<{ ingredientId: string }>
} & Record<string, unknown>

type RemoveProductIngredientVariables = {
  productId: string
  slug: string
  ingredientId: string
}

export function useRemoveProductIngredient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ productId, ingredientId }: RemoveProductIngredientVariables) => {
      const res = await api.products[':productId'].ingredients[':ingredientId'].$delete({
        param: { productId, ingredientId },
      })
      if (!res.ok) throw new Error('Failed to remove product ingredient')
    },
    // Optimistic remove so unrelated rows stay interactive during the request.
    onMutate: (variables) => {
      return applyOptimisticUpdates(qc, variables, [
        optimisticCacheUpdate<RemoveProductIngredientVariables, BySlugData>({
          queryKey: ({ slug }) => productKeys.bySlug(slug),
          updater: (previous, { ingredientId }) => {
            if (!previous) return previous
            return {
              ...previous,
              ingredients: previous.ingredients.filter((i) => i.ingredientId !== ingredientId),
            }
          },
        }),
      ])
    },
    onError: (_err, _variables, context) => {
      context?.rollback()
    },
    onSettled: (_, __, { productId, slug }) => {
      qc.invalidateQueries({ queryKey: productKeys.ingredients(productId) })
      qc.invalidateQueries({ queryKey: productKeys.bySlug(slug) })
    },
    meta: { errorMessage: "Retrait de l'ingrédient impossible." },
  })
}

export type ProductListItem = ProductListData['items'][number]

// Inferred from query; backend field additions surface automatically.
export type ProductDetail = NonNullable<
  Awaited<ReturnType<NonNullable<ReturnType<typeof productQueries.bySlug>['queryFn']>>>
>

export type ProductFormulaPreview = ApiData<(typeof api.products)['formula-preview']['$post']>

export function usePreviewProductFormula() {
  return useMutation({
    mutationFn: async (input: ProductFormulaPreviewInput) => {
      const res = await api.products['formula-preview'].$post({ json: input })
      await throwIfNotOk(res, 'formula_preview_failed')
      const json = await res.json()
      if (!json.success) throw new ApiError('formula_preview_failed', res.status)
      return json.data
    },
  })
}
