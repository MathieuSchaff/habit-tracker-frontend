import type { BlogCategory, CreateArticleInput, UpdateArticleInput } from '@habit-tracker/shared'

import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '../api'

export type ListArticlesFilters = {
  category?: BlogCategory
  q?: string
  page?: number
  limit?: number
  publishedOnly?: boolean
}

export const articleKeys = {
  all: ['articles'] as const,
  lists: () => [...articleKeys.all, 'list'] as const,
  list: (filters: ListArticlesFilters = {}) => [...articleKeys.all, 'list', filters] as const,
  bySlug: (slug: string) => [...articleKeys.all, slug] as const,
}

export const articleQueries = {
  list: (filters: ListArticlesFilters = {}) =>
    queryOptions({
      queryKey: articleKeys.list(filters),
      queryFn: async () => {
        const query: Record<string, string> = {
          page: String(filters.page ?? 1),
          limit: String(filters.limit ?? 20),
          publishedOnly: String(filters.publishedOnly ?? true),
        }
        if (filters.category) query.category = filters.category
        if (filters.q) query.q = filters.q

        const res = await api.articles.$get({ query })
        if (!res.ok) throw new Error('Failed to fetch articles')
        const json = await res.json()
        return json.data
      },
    }),

  bySlug: (slug: string) =>
    queryOptions({
      queryKey: articleKeys.bySlug(slug),
      queryFn: async () => {
        const res = await api.articles[':slug'].$get({ param: { slug } })
        if (!res.ok) throw new Error('Failed to fetch article')
        const json = await res.json()
        return json.data
      },
      enabled: !!slug,
    }),
}

export function useCreateArticle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateArticleInput) => {
      const res = await api.articles.$post({ json: data })
      if (!res.ok) throw new Error('Failed to create article')
      const json = await res.json()
      if (!json.success) throw new Error('Failed to create article')
      return json.data
    },
    onSuccess: (article) => {
      qc.setQueryData(articleKeys.bySlug(article.slug), article)
      qc.invalidateQueries({ queryKey: articleKeys.lists() })
    },
  })
}

export function useUpdateArticle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ slug, data }: { slug: string; data: UpdateArticleInput }) => {
      const res = await api.articles[':slug'].$patch({ param: { slug }, json: data })
      if (!res.ok) {
        const error = new Error('Failed to update article')
        ;(error as Error & { status: number }).status = res.status
        throw error
      }
      const json = await res.json()
      if (!json.success) throw new Error('Failed to update article')
      return json.data
    },
    onSuccess: (article, { slug }) => {
      qc.setQueryData(articleKeys.bySlug(article.slug), article)
      if (article.slug !== slug) qc.removeQueries({ queryKey: articleKeys.bySlug(slug) })
      qc.invalidateQueries({ queryKey: articleKeys.lists() })
    },
  })
}

export function useDeleteArticle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (slug: string) => {
      const res = await api.articles[':slug'].$delete({ param: { slug } })
      if (!res.ok) throw new Error('Failed to delete article')
    },
    onSuccess: (_, slug) => {
      qc.removeQueries({ queryKey: articleKeys.bySlug(slug) })
      qc.invalidateQueries({ queryKey: articleKeys.lists() })
    },
  })
}
