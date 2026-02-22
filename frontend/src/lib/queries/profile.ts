import type { ProfileUpdateInput } from '@habit-tracker/shared'

import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '../api'

export const profileQueries = {
  me: () =>
    queryOptions({
      queryKey: ['profile', 'me'],
      queryFn: async () => {
        const res = await api.profile.$get()
        const json = await res.json()
        if (!json.success) throw new Error(json.error)
        return json.data
      },
      staleTime: 1000 * 60 * 5,
    }),
}

export const useUpdateProfile = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ProfileUpdateInput) => {
      const res = await api.profile.$patch({ json: data })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['profile', 'me'], data)
    },
  })
}
