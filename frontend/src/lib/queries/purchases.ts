import type {
  AddPurchaseInput,
  FinishPurchaseInput,
  OpenPurchaseInput,
  UpdatePurchaseInput,
} from '@habit-tracker/shared'

import { type QueryClient, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '../api'
import { userProductKeys } from './user-products'

export const purchaseKeys = {
  all: ['purchases'] as const,
  byUserProduct: (userProductId: string) => [...purchaseKeys.all, userProductId] as const,
}

// All purchase mutations invalidate both the purchase list of the affected
// user-product and the global user-product list (qty/lifecycle changes).
function invalidateAfterPurchaseMutation(qc: QueryClient, userProductId: string) {
  qc.invalidateQueries({ queryKey: purchaseKeys.byUserProduct(userProductId) })
  qc.invalidateQueries({ queryKey: userProductKeys.all })
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
    onSuccess: (_, { userProductId }) =>
      invalidateAfterPurchaseMutation(queryClient, userProductId),
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
    onSuccess: (_, { userProductId }) =>
      invalidateAfterPurchaseMutation(queryClient, userProductId),
    meta: { errorMessage: "Impossible d'entamer le flacon." },
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
    onSuccess: (_, { userProductId }) =>
      invalidateAfterPurchaseMutation(queryClient, userProductId),
    meta: { errorMessage: 'Impossible de terminer le flacon.' },
  })
}

export const useUpdatePurchase = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      userProductId,
      purchaseId,
      input,
    }: {
      userProductId: string
      purchaseId: string
      input: UpdatePurchaseInput
    }) => {
      const res = await api['user-products'][':id'].purchases[':purchaseId'].$patch({
        param: { id: userProductId, purchaseId },
        json: input,
      })
      if (!res.ok) throw new Error('Failed to update purchase')
      const data = await res.json()
      return data.data
    },
    onSuccess: (_, { userProductId }) =>
      invalidateAfterPurchaseMutation(queryClient, userProductId),
    // Caller (AddPurchaseDialog) shows its own toast.
  })
}

export const useDeletePurchase = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      userProductId,
      purchaseId,
    }: {
      userProductId: string
      purchaseId: string
    }) => {
      const res = await api['user-products'][':id'].purchases[':purchaseId'].$delete({
        param: { id: userProductId, purchaseId },
      })
      if (!res.ok) throw new Error('Failed to delete purchase')
    },
    onSuccess: (_, { userProductId }) =>
      invalidateAfterPurchaseMutation(queryClient, userProductId),
    meta: { errorMessage: 'Suppression de cet achat impossible.' },
  })
}
