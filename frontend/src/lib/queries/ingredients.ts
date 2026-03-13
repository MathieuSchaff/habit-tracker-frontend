import type {
  CreateIngredientInput,
  Ingredient,
  UpdateIngredientInput,
} from '@habit-tracker/shared'

import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '../api'

type ApiResponse<T> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; details?: Record<string, string[]> }

export type ListIngredientsFilters = {
  category?: string[]
  concern?: string[]
  skinType?: string[]
  attribute?: string[]
  page?: number
  limit?: number
}
export const ingredientKeys = {
  all: ['ingredients'] as const,
  lists: () => [...ingredientKeys.all, 'list'] as const,
  list: (filters: ListIngredientsFilters = {}) => [...ingredientKeys.lists(), filters] as const,
  bySlug: (slug: string) => [...ingredientKeys.all, slug] as const,
  products: (slug: string) => [...ingredientKeys.all, slug, 'products'] as const,
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
        const query: Record<string, string> = {}

        if (filters.category?.length) query.category = filters.category.join(',')
        if (filters.concern?.length) query.concern = filters.concern.join(',')
        if (filters.skinType?.length) query.skinType = filters.skinType.join(',')
        if (filters.attribute?.length) query.attribute = filters.attribute.join(',')
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
        const json = await res.json()
        if (!res.ok) throw new Error('Failed to fetch ingredient')
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
}

// Mutations

export function useCreateIngredient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateIngredientInput) => {
      const res = await api.ingredients.$post({ json: data })
      const json = await res.json()
      if (!res.ok) throw new Error('Failed to create ingredient')
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
    mutationFn: async ({ id, data }: { id: string; data: UpdateIngredientInput }) => {
      const res = await api.ingredients[':id'].$patch({ param: { id }, json: data })
      const json = (await res.json()) as ApiResponse<Ingredient>
      if (!json.success) throw new Error(json.error)
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
      const json = (await res.json()) as ApiResponse<null>
      if (!json.success) throw new Error(json.error)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ingredientKeys.lists() })
    },
  })
}
