import type {
  AllIngredientTagCategory,
  CreateIngredientInput,
  IngredientType,
  ReplaceIngredientTagsInput,
  UpdateIngredientRouteInput,
} from '@habit-tracker/shared'

import {
  infiniteQueryOptions,
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'

import { api } from '../api'

// Per-axis slug arrays + the active domain. The page builds this from URL
// search params; the queryFn flattens it back to comma-joined query strings.
export type ListIngredientsFilters = Partial<Record<AllIngredientTagCategory, string[]>> & {
  type?: IngredientType
  sort?: 'name' | 'random'
  page?: number
  limit?: number
}

export const ingredientKeys = {
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
        const query: Record<string, string> = {}

        for (const axis of TAG_AXES) {
          const values = filters[axis]
          if (values?.length) query[axis] = values.join(',')
        }
        if (filters.type) query.ingredient_type = filters.type
        if (filters.sort !== undefined) query.sort = filters.sort
        if (filters.page) query.page = String(filters.page)
        if (filters.limit) query.limit = String(filters.limit)

        const res = await api.ingredients.$get({ query })
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
      queryFn: async () => {
        const res = await api.ingredients.search.$get({ query: { q: query } })
        if (!res.ok) throw new Error('Search failed')
        const json = await res.json()
        return json.data
      },
      enabled: query.length >= 2,
    }),

  // Wraps the single-page response so consumers using the unified infinite
  // SearchCombobox interface (e.g. IngredientsPage) can plug in. Backend has
  // no pagination on ingredient search yet — hasMore is always false.
  searchInfinite: (query: string) =>
    infiniteQueryOptions({
      queryKey: [...ingredientKeys.all, 'search-infinite', query] as const,
      queryFn: async () => {
        const res = await api.ingredients.search.$get({ query: { q: query } })
        if (!res.ok) throw new Error('Search failed')
        const json = await res.json()
        return { items: json.data, hasMore: false, nextOffset: 0 }
      },
      initialPageParam: 0 as number,
      getNextPageParam: (): number | undefined => undefined,
      enabled: query.length >= 2,
    }),

  // Resolve names for a list of slugs (chips deep-linked from URL).
  // Cached long enough that re-mount of the filter doesn't refetch.
  bySlugs: (slugs: string[]) =>
    queryOptions({
      queryKey: [...ingredientKeys.all, 'by-slugs', [...slugs].sort()] as const,
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
      if (!res.ok) throw new Error('Failed to create ingredient')
      const json = await res.json()
      if (!json.success) throw new Error('Failed to create ingredient')
      return json.data
    },
    onSuccess: (ingredient) => {
      qc.setQueryData(ingredientKeys.bySlug(ingredient.slug), ingredient)
      qc.invalidateQueries({ queryKey: ingredientKeys.lists() })
    },
  })
}

export function useUpdateIngredient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateIngredientRouteInput }) => {
      const res = await api.ingredients[':id'].$patch({ param: { id }, json: data })

      if (!res.ok) {
        // We attach the HTTP status to the error so the caller can check for 409 (conflict) specifically
        const body = await res.json().catch(() => null)
        const error = new Error(body?.message ?? 'Failed to update ingredient')
        ;(error as Error & { status: number }).status = res.status
        throw error
      }

      const json = await res.json()
      if (!json.success) throw new Error('Failed to update ingredient')
      return json.data
    },
    onSuccess: (ingredient) => {
      qc.setQueryData(ingredientKeys.bySlug(ingredient.slug), ingredient)
      qc.invalidateQueries({ queryKey: ingredientKeys.lists() })
    },
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
  })
}
