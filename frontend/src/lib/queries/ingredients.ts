import type {
  AllIngredientTagCategory,
  CreateIngredientInput,
  IngredientSort,
  IngredientType,
  ReplaceIngredientTagsInput,
  UpdateIngredientRouteInput,
} from '@aurore/shared'

import {
  infiniteQueryOptions,
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'

import { api } from '../api'
import { ApiError, throwIfNotOk } from '../helpers/apiError'

// Per-axis slug arrays; queryFn flattens to comma-joined query strings.
export type ListIngredientsFilters = Partial<Record<AllIngredientTagCategory, string[]>> & {
  type?: IngredientType
  sort?: IngredientSort
  page?: number
  limit?: number
  // Profile-derived avoid tags; backend flags rows as `profileMatches`.
  avoid_for?: string[]
}

const ingredientKeys = {
  all: ['ingredients'] as const,
  lists: () => [...ingredientKeys.all, 'list'] as const,
  list: (filters: ListIngredientsFilters = {}) => [...ingredientKeys.all, 'list', filters] as const,
  bySlug: (slug: string) => [...ingredientKeys.all, slug] as const,
  products: (slug: string) => [...ingredientKeys.all, slug, 'products'] as const,
  tags: (id: string) => [...ingredientKeys.all, id, 'tags'] as const,
  options: () => [...ingredientKeys.all, 'options'] as const,
  filterOptions: (type?: IngredientType) =>
    [...ingredientKeys.all, 'filter-options', type ?? 'all'] as const,
}

const TAG_AXES: readonly AllIngredientTagCategory[] = [
  'concern',
  'skin_type',
  'hair_type',
  'age_group',
  'goal',
  'moment',
  'restriction',
  'ingredient_attribute',
  'skin_effect',
  'hair_effect',
  'dental_effect',
  'shared_label',
]

// Extracted (was inlined in `list.queryFn`) so the filter → query mapping
// can be unit-tested without spinning up react-query / msw.
export function buildListIngredientsQuery(filters: ListIngredientsFilters): Record<string, string> {
  const query: Record<string, string> = {}
  for (const axis of TAG_AXES) {
    const values = filters[axis]
    if (values?.length) query[axis] = values.join(',')
  }
  if (filters.type) query.ingredient_type = filters.type
  if (filters.avoid_for?.length) query.avoid_for = filters.avoid_for.join(',')
  if (filters.sort !== undefined) query.sort = filters.sort
  if (filters.page) query.page = String(filters.page)
  if (filters.limit) query.limit = String(filters.limit)
  return query
}

export const ingredientQueries = {
  all: () =>
    queryOptions({
      queryKey: [...ingredientKeys.all, 'all'] as const,
      queryFn: async () => {
        const res = await api.ingredients.$get({ query: {} })
        if (!res.ok) throw new Error('Failed to fetch ingredients')
        const json = await res.json()
        return json.data
      },
      staleTime: 5 * 60 * 1000,
    }),

  list: (filters: ListIngredientsFilters = {}) =>
    queryOptions({
      queryKey: ingredientKeys.list(filters),
      queryFn: async () => {
        const res = await api.ingredients.$get({ query: buildListIngredientsQuery(filters) })
        if (!res.ok) throw new Error('Failed to fetch ingredients')
        const json = await res.json()
        return json.data
      },
    }),

  bySlug: (slug: string) =>
    queryOptions({
      queryKey: ingredientKeys.bySlug(slug),
      queryFn: async () => {
        const res = await api.ingredients[':slug'].$get({ param: { slug } })
        if (!res.ok) throw new Error('Failed to fetch ingredient')
        const json = await res.json()
        return json.data
      },
      enabled: !!slug,
      staleTime: 5 * 60 * 1000,
    }),

  products: (slug: string) =>
    queryOptions({
      queryKey: ingredientKeys.products(slug),
      queryFn: async () => {
        const res = await api.ingredients[':slug'].products.$get({ param: { slug } })
        if (!res.ok) throw new Error('Failed to fetch ingredient products')
        const json = await res.json()
        return json.data
      },
      enabled: !!slug,
    }),

  tags: (id: string) =>
    queryOptions({
      queryKey: ingredientKeys.tags(id),
      queryFn: async () => {
        const res = await api.ingredients[':ingredientId'].tags.$get({
          param: { ingredientId: id },
        })
        if (!res.ok) throw new Error('Failed to fetch ingredient tags')
        const json = await res.json()
        return json.data
      },
      enabled: !!id,
    }),

  search: (query: string) =>
    queryOptions({
      queryKey: [...ingredientKeys.all, 'search', query] as const,
      queryFn: async ({ signal }) => {
        const res = await api.ingredients.search.$get({ query: { q: query } }, { init: { signal } })
        if (!res.ok) throw new Error('Search failed')
        const json = await res.json()
        return json.data
      },
      enabled: query.length >= 2,
    }),

  // Wraps single-page response for the SearchCombobox infinite interface; backend has no pagination yet.
  searchInfinite: (query: string) =>
    infiniteQueryOptions({
      queryKey: [...ingredientKeys.all, 'search-infinite', query] as const,
      queryFn: async ({ signal }) => {
        const res = await api.ingredients.search.$get({ query: { q: query } }, { init: { signal } })
        if (!res.ok) throw new Error('Search failed')
        const json = await res.json()
        return { items: json.data, hasMore: false, nextOffset: 0 }
      },
      initialPageParam: 0 as number,
      getNextPageParam: (): number | undefined => undefined,
      enabled: query.length >= 2,
    }),

  // Resolve names for slugs deep-linked from URL; cached so filter re-mount doesn't refetch.
  bySlugs: (slugs: string[]) =>
    queryOptions({
      queryKey: [...ingredientKeys.all, 'by-slugs', slugs.toSorted()] as const,
      queryFn: async () => {
        const res = await api.ingredients['by-slugs'].$get({
          query: { slugs: slugs.join(',') },
        })
        if (!res.ok) throw new Error('Failed to resolve ingredient slugs')
        const json = await res.json()
        return json.data
      },
      enabled: slugs.length > 0,
      staleTime: 10 * 60 * 1000,
    }),
  options: () =>
    queryOptions({
      queryKey: [...ingredientKeys.all, 'options'] as const,
      queryFn: async () => {
        const res = await api.ingredients.options.$get()
        if (!res.ok) throw new Error('Failed to fetch ingredient options')
        const json = await res.json()
        return json.data
      },
      staleTime: 10 * 60 * 1000,
    }),

  filterOptions: (type?: IngredientType) =>
    queryOptions({
      queryKey: ingredientKeys.filterOptions(type),
      queryFn: async () => {
        const res = await api.ingredients['filter-options'].$get({
          query: type ? { type } : {},
        })
        if (!res.ok) throw new Error('Failed to fetch ingredient filter options')
        const json = await res.json()
        return json.data
      },
      staleTime: 10 * 60 * 1000,
    }),
}

export function useCreateIngredient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateIngredientInput) => {
      const res = await api.ingredients.$post({ json: data })
      await throwIfNotOk(res, 'ingredient_creation_failed')
      const json = await res.json()
      if (!json.success) throw new ApiError('ingredient_creation_failed', res.status)
      return json.data
    },
    onSuccess: (ingredient) => {
      qc.setQueryData(ingredientKeys.bySlug(ingredient.slug), ingredient)
      qc.invalidateQueries({ queryKey: ingredientKeys.lists() })
    },
    meta: { errorMessage: "Impossible de créer l'ingrédient." },
  })
}

export function useUpdateIngredient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateIngredientRouteInput }) => {
      const res = await api.ingredients[':id'].$patch({ param: { id }, json: data })
      // 409 conflict is surfaced inline by IngredientForm via the thrown ApiError.
      await throwIfNotOk(res, 'ingredient_update_failed')
      const json = await res.json()
      if (!json.success) throw new ApiError('ingredient_update_failed', res.status)
      return json.data
    },
    onSuccess: (ingredient) => {
      qc.setQueryData(ingredientKeys.bySlug(ingredient.slug), ingredient)
      qc.invalidateQueries({ queryKey: ingredientKeys.lists() })
    },
    // 409 conflict handled inline in IngredientForm; no global toast.
  })
}

export function useDeleteIngredient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.ingredients[':id'].$delete({ param: { id } })
      if (!res.ok) throw new Error('Failed to delete ingredient')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ingredientKeys.lists() })
    },
    meta: { errorMessage: "Impossible de supprimer l'ingrédient." },
  })
}

export function useUpdateIngredientTags() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      ingredientId,
      tags,
    }: {
      ingredientId: string
      tags: ReplaceIngredientTagsInput['tags']
    }) => {
      const res = await api.ingredients[':ingredientId'].tags.$put({
        param: { ingredientId },
        json: { tags },
      })
      if (!res.ok) throw new Error('Failed to update ingredient tags')
      const json = await res.json()
      if (!json.success) throw new Error('Failed to update ingredient tags')
      return json.data
    },
    onSuccess: (_, { ingredientId }) => {
      qc.invalidateQueries({ queryKey: ingredientKeys.tags(ingredientId) })
    },
    meta: { errorMessage: 'Impossible de mettre à jour les tags.' },
  })
}
