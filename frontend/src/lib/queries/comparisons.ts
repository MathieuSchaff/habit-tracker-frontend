import type { CreateComparisonInput, UpdateComparisonInput } from '@habit-tracker/shared'

import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '../api'

export const comparisonKeys = {
  all: ['product-comparisons'] as const,
  list: () => [...comparisonKeys.all, 'list'] as const,
  detail: (id: string) => [...comparisonKeys.all, 'detail', id] as const,
}

export const comparisonQueries = {
  list: () =>
    queryOptions({
      queryKey: comparisonKeys.list(),
      queryFn: async () => {
        const res = await api['product-comparisons'].$get()
        if (!res.ok) throw new Error('Failed to list comparisons')
        const data = await res.json()
        return data.data
      },
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: comparisonKeys.detail(id),
      queryFn: async () => {
        const res = await api['product-comparisons'][':id'].$get({ param: { id } })
        if (!res.ok) throw new Error('Failed to fetch comparison')
        const data = await res.json()
        return data.data
      },
    }),
}

export const useCreateComparison = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateComparisonInput) => {
      const res = await api['product-comparisons'].$post({ json: input })
      if (!res.ok) throw new Error('Failed to create comparison')
      const data = await res.json()
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: comparisonKeys.list() })
    },
    meta: { errorMessage: 'Création de la comparaison impossible.' },
  })
}

export const useUpdateComparison = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateComparisonInput }) => {
      const res = await api['product-comparisons'][':id'].$patch({
        param: { id },
        json: input,
      })
      if (!res.ok) throw new Error('Failed to update comparison')
      const data = await res.json()
      return data.data
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: comparisonKeys.detail(id) })
      qc.invalidateQueries({ queryKey: comparisonKeys.list() })
    },
    meta: { errorMessage: 'Mise à jour de la comparaison impossible.' },
  })
}

export const useDeleteComparison = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api['product-comparisons'][':id'].$delete({ param: { id } })
      if (!res.ok) throw new Error('Failed to delete comparison')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: comparisonKeys.all })
    },
    meta: { errorMessage: 'Suppression de la comparaison impossible.' },
  })
}
