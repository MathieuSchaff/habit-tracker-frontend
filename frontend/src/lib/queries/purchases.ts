import type {
  AddPurchaseInput,
  FinishPurchaseInput,
  OpenPurchaseInput,
} from '@habit-tracker/shared'

import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '../api'
import { userProductKeys } from './user-products'

export const purchaseKeys = {
  all: ['purchases'] as const,
  byUserProduct: (userProductId: string) => [...purchaseKeys.all, userProductId] as const,
}

export const purchaseQueries = {
  byUserProduct: (userProductId: string) =>
    queryOptions({
      queryKey: purchaseKeys.byUserProduct(userProductId),
      queryFn: async () => {
        const res = await api['user-products'][':id'].purchases.$get({
          param: { id: userProductId },
        })
        if (!res.ok) throw new Error('Failed to fetch purchases')
        const data = await res.json()
        return data.data
      },
    }),
}

export const useAddPurchase = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      userProductId,
      input,
    }: {
      userProductId: string
      input: AddPurchaseInput
    }) => {
      const res = await api['user-products'][':id'].purchases.$post({
        param: { id: userProductId },
        json: input,
      })
      if (!res.ok) throw new Error('Failed to add purchase')
      const data = await res.json()
      return data.data
    },
    onSuccess: (_, { userProductId }) => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.byUserProduct(userProductId) })
      queryClient.invalidateQueries({ queryKey: userProductKeys.all })
    },
  })
}

export const useOpenPurchase = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      userProductId,
      purchaseId,
      input,
    }: {
      userProductId: string
      purchaseId: string
      input: OpenPurchaseInput
    }) => {
      const res = await api['user-products'][':id'].purchases[':purchaseId'].open.$post({
        param: { id: userProductId, purchaseId },
        json: input,
      })
      if (!res.ok) throw new Error('Failed to open purchase')
      const data = await res.json()
      return data.data
    },
    onSuccess: (_, { userProductId }) => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.byUserProduct(userProductId) })
      queryClient.invalidateQueries({ queryKey: userProductKeys.all })
    },
  })
}

export const useFinishPurchase = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      userProductId,
      input,
    }: {
      userProductId: string
      input: FinishPurchaseInput
    }) => {
      const res = await api['user-products'][':id'].purchases.finish.$post({
        param: { id: userProductId },
        json: input,
      })
      if (!res.ok) throw new Error('Failed to finish purchase')
      const data = await res.json()
      return data.data
    },
    onSuccess: (_, { userProductId }) => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.byUserProduct(userProductId) })
      queryClient.invalidateQueries({ queryKey: userProductKeys.all })
    },
  })
}
