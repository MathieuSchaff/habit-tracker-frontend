import type {
  CreateUserProductInput,
  UpdateUserProductInput,
  UpdateUserProductReviewInput,
} from '@habit-tracker/shared'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '../api'

export const userProductKeys = {
  all: ['user-products'] as const,
  lists: () => [...userProductKeys.all, 'list'] as const,
  list: () => [...userProductKeys.lists()] as const,
  detail: (id: string) => [...userProductKeys.all, 'detail', id] as const,
  byProduct: (productId: string) => [...userProductKeys.all, 'by-product', productId] as const,
}

export const userProductQueries = {
  list: () => ({
    queryKey: userProductKeys.list(),
    queryFn: async () => {
      const res = await api['user-products'].$get()
      if (!res.ok) throw new Error('Failed to fetch user products')
      const data = await res.json()
      return data.data
    },
  }),
  detail: (id: string) => ({
    queryKey: userProductKeys.detail(id),
    queryFn: async () => {
      const res = await api['user-products'][':id'].$get({ param: { id } })
      if (!res.ok) throw new Error('User product not found')
      const data = await res.json()
      return data.data
    },
  }),
  byProduct: (productId: string) => ({
    queryKey: userProductKeys.byProduct(productId),
    queryFn: async () => {
      const res = await api['user-products'].product[':productId'].$get({ param: { productId } })
      if (!res.ok) throw new Error('User product not found')
      const data = await res.json()
      return data.data
    },
    retry: false,
  }),
}

export const useCreateUserProduct = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateUserProductInput) => {
      const res = await api['user-products'].$post({ json: input })
      if (!res.ok) throw new Error('Failed to create user product')
      const data = await res.json()
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userProductKeys.all })
    },
  })
}

export const useUpdateUserProduct = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateUserProductInput }) => {
      const res = await api['user-products'][':id'].$patch({
        param: { id },
        json: input,
      })
      if (!res.ok) throw new Error('Failed to update user product')
      const data = await res.json()
      return data.data
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: userProductKeys.all })
      queryClient.invalidateQueries({ queryKey: userProductKeys.detail(id) })
    },
  })
}

export const useDeleteUserProduct = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api['user-products'][':id'].$delete({ param: { id } })
      if (!res.ok) throw new Error('Failed to delete user product')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userProductKeys.all })
    },
  })
}

export const useUpsertUserProductReview = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateUserProductReviewInput }) => {
      const res = await api['user-products'][':id'].review.$put({
        param: { id },
        json: input,
      })
      if (!res.ok) throw new Error('Failed to update review')
      const data = await res.json()
      return data.data
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: userProductKeys.detail(id) })
    },
  })
}
