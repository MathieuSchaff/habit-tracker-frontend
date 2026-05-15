import type {
  CreateUserProductInput,
  UpdateUserProductInput,
  UpdateUserProductReviewInput,
} from '@habit-tracker/shared'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { InferResponseType } from 'hono/client'

import { api } from '../api'
import { applyOptimisticUpdates, optimisticCacheUpdate } from './optimistic'

export type UserProduct = Extract<
  InferResponseType<(typeof api)['user-products']['$get']>,
  { data: unknown }
>['data'][number]

type UpdateUserProductVariables = {
  id: string
  input: UpdateUserProductInput
}

type UpsertUserProductReviewVariables = {
  id: string
  input: UpdateUserProductReviewInput
}

type UserProductReview = NonNullable<UserProduct['review']>

function patchUserProductReview(
  userProduct: UserProduct,
  input: UpdateUserProductReviewInput
): UserProduct {
  return {
    ...userProduct,
    review: {
      ...userProduct.review,
      userProductId: userProduct.id,
      ...input,
    } as UserProductReview,
  }
}

// History uses its own root prefix so it can be invalidated independently
// and stays out of the way of broad `user-products` cache routing (test
// fixtures keyed by queryKey[0]).
const userProductHistoryRoot = ['user-product-history'] as const

export const userProductKeys = {
  all: ['user-products'] as const,
  lists: () => [...userProductKeys.all, 'list'] as const,
  list: () => [...userProductKeys.lists()] as const,
  detail: (id: string) => [...userProductKeys.all, 'detail', id] as const,
  byProduct: (productId: string) => [...userProductKeys.all, 'by-product', productId] as const,
  historyRoot: () => userProductHistoryRoot,
  history: (id: string) => [...userProductHistoryRoot, id] as const,
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
  history: (id: string) => ({
    queryKey: userProductKeys.history(id),
    queryFn: async () => {
      const res = await api['user-products'][':id'].history.$get({ param: { id } })
      if (!res.ok) throw new Error('Failed to fetch status history')
      const data = await res.json()
      return data.data
    },
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
      queryClient.invalidateQueries({ queryKey: userProductKeys.historyRoot() })
    },
    // Callers (useQuickAdd, AddToCollectionModal) drive their own toast.
  })
}

/**
 * Updates the list in the cache right away so the UI feels instant,
 * then rolls back to the previous state if the server returns an error.
 */
export const useUpdateUserProduct = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: UpdateUserProductVariables) => {
      const res = await api['user-products'][':id'].$patch({
        param: { id },
        json: input,
      })
      if (!res.ok) throw new Error('Failed to update user product')
      const data = await res.json()
      return data.data
    },
    onMutate: (variables) => {
      return applyOptimisticUpdates(queryClient, variables, [
        optimisticCacheUpdate<UpdateUserProductVariables, UserProduct[]>({
          queryKey: userProductKeys.list(),
          updater: (oldProducts, { id, input }) => {
            if (!oldProducts) return oldProducts
            return oldProducts.map((product) =>
              product.id === id ? { ...product, ...input } : product
            )
          },
        }),
      ])
    },
    onError: (_error, _variables, context) => {
      context?.rollback()
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: userProductKeys.all })
      queryClient.invalidateQueries({ queryKey: userProductKeys.historyRoot() })
    },
    meta: { errorMessage: 'Modification impossible — réessayez plus tard.' },
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
    meta: { errorMessage: 'Suppression impossible — réessayez plus tard.' },
  })
}

export const useUpsertUserProductReview = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: UpsertUserProductReviewVariables) => {
      const res = await api['user-products'][':id'].review.$put({
        param: { id },
        json: input,
      })
      if (!res.ok) throw new Error('Failed to update review')
      const data = await res.json()
      return data.data
    },
    onMutate: (variables) => {
      return applyOptimisticUpdates(queryClient, variables, [
        optimisticCacheUpdate<UpsertUserProductReviewVariables, UserProduct[]>({
          queryKey: userProductKeys.list(),
          updater: (oldProducts, { id, input }) => {
            if (!oldProducts) return oldProducts
            return oldProducts.map((product) =>
              product.id === id ? patchUserProductReview(product, input) : product
            )
          },
        }),
        optimisticCacheUpdate<UpsertUserProductReviewVariables, UserProduct>({
          queryKey: ({ id }) => userProductKeys.detail(id),
          updater: (oldProduct, { input }) => {
            if (!oldProduct) return oldProduct
            return patchUserProductReview(oldProduct, input)
          },
        }),
      ])
    },
    onError: (_error, _variables, context) => {
      context?.rollback()
    },
    onSettled: (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: userProductKeys.all })
      queryClient.invalidateQueries({ queryKey: userProductKeys.detail(id) })
    },
    meta: { errorMessage: 'Note non enregistrée — réessayez plus tard.' },
  })
}
