import type {
  CreateIngredientInput,
  ReplaceIngredientTagsInput,
  UpdateIngredientInput,
} from '@habit-tracker/shared'

import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '../api'

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
  list: (filters: ListIngredientsFilters = {}) => [...ingredientKeys.all, 'list', filters] as const,
  bySlug: (slug: string) => [...ingredientKeys.all, slug] as const,
  products: (slug: string) => [...ingredientKeys.all, slug, 'products'] as const,
  tags: (id: string) => [...ingredientKeys.all, id, 'tags'] as const,
  options: () => [...ingredientKeys.all, 'options'] as const,
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
}

// Mutations
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
    mutationFn: async ({ id, data }: { id: string; data: UpdateIngredientInput }) => {
      const res = await api.ingredients[':id'].$patch({ param: { id }, json: data })
      if (!res.ok) throw new Error('Failed to update ingredient')
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
