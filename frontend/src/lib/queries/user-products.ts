import type {
  CreateUserProductInput,
  UpdateUserProductInput,
  UpdateUserProductReviewInput,
} from '@aurore/shared'

import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { type ApiData, api } from '../api'
import { ApiError } from '../helpers/apiError'
import { compatibilityKeys } from './compatibility'
import { applyOptimisticUpdates, optimisticCacheUpdate } from './optimistic'
import { productKeys } from './products'

export type UserProduct = ApiData<(typeof api)['user-products']['$get']>[number]

type IdMutation<T> = { id: string; input: T }

export type UpdateUserProductVariables = IdMutation<UpdateUserProductInput>

type UpsertUserProductReviewVariables = IdMutation<UpdateUserProductReviewInput>

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

// Separate root so history invalidates independently and doesn't collide with `user-products` routing.
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
  list: () =>
    queryOptions({
      queryKey: userProductKeys.list(),
      queryFn: async () => {
        const res = await api['user-products'].$get()
        if (!res.ok) throw new ApiError('http_error', res.status)
        const data = await res.json()
        return data.data
      },
      // Personal catalogue rarely mutates; mutations already invalidate via userProductKeys.all.
      staleTime: 5 * 60 * 1000,
    }),
  detail: (id: string) => ({
    queryKey: userProductKeys.detail(id),
    queryFn: async () => {
      const res = await api['user-products'][':id'].$get({ param: { id } })
      if (!res.ok) throw new ApiError('http_error', res.status)
      const data = await res.json()
      return data.data
    },
  }),
  byProduct: (productId: string) => ({
    queryKey: userProductKeys.byProduct(productId),
    queryFn: async () => {
      const res = await api['user-products'].product[':productId'].$get({ param: { productId } })
      if (!res.ok) throw new ApiError('http_error', res.status)
      const data = await res.json()
      return data.data
    },
    retry: false,
  }),
  history: (id: string) => ({
    queryKey: userProductKeys.history(id),
    queryFn: async () => {
      const res = await api['user-products'][':id'].history.$get({ param: { id } })
      if (!res.ok) throw new ApiError('http_error', res.status)
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
      queryClient.invalidateQueries({ queryKey: productKeys.shelfStatuses() })
    },
    // useQuickAdd / AddToCollectionModal drive their own toast.
  })
}

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
      queryClient.invalidateQueries({ queryKey: productKeys.shelfStatuses() })
      // status/sentiment moves the empirical signal but not the product-id set the
      // compatibility query is keyed on, so it must be invalidated explicitly.
      queryClient.invalidateQueries({ queryKey: compatibilityKeys.all })
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
      queryClient.invalidateQueries({ queryKey: productKeys.shelfStatuses() })
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
    onSettled: (_, __, { id, input }) => {
      queryClient.invalidateQueries({ queryKey: userProductKeys.all })
      queryClient.invalidateQueries({ queryKey: userProductKeys.detail(id) })
      // A saved review (tolerance) shifts the signal but not the product-id set the
      // compatibility query is keyed on — invalidate it explicitly.
      queryClient.invalidateQueries({ queryKey: compatibilityKeys.all })
      // Public-reviews surface depends on isPublic flips - refetch whenever the
      // toggle is part of the patch. Predicate scoping avoids nuking unrelated
      // product caches (bySlug, lists, ingredients...).
      // ratingsPublic also changes the public payload (axes nulled or revealed).
      if (input.isPublic !== undefined || input.ratingsPublic !== undefined) {
        queryClient.invalidateQueries({
          queryKey: productKeys.all,
          predicate: (q) => q.queryKey.includes('reviews') && q.queryKey.includes('public'),
        })
      }
    },
    meta: { errorMessage: 'Note non enregistrée — réessayez plus tard.' },
  })
}
