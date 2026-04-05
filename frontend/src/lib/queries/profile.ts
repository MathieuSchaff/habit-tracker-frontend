import type {
  ProfileUpdateInput,
  UpdatePrivacySettingsInput,
  UserDermoProfileUpdateInput,
} from '@habit-tracker/shared'

import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '../api'

export const profileQueries = {
  me: () =>
    queryOptions({
      queryKey: ['profile', 'me'],
      queryFn: async () => {
        const res = await api.profile.$get()
        const json = await res.json()
        if (!json.success) throw new Error('error' in json ? json.error : 'Request failed')
        return json.data
      },
      staleTime: 1000 * 60 * 5,
    }),
  stats: () =>
    queryOptions({
      queryKey: ['profile', 'stats'],
      queryFn: async () => {
        const res = await api.profile.stats.$get()
        const json = await res.json()
        return json.data
      },
      staleTime: 1000 * 60 * 5,
    }),
  dermo: () =>
    queryOptions({
      queryKey: ['profile', 'dermo'],
      queryFn: async () => {
        const res = await api.profile.dermo.$get()
        const json = await res.json()
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
      if (!json.success) throw new Error('error' in json ? json.error : 'Request failed')
      return json.data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['profile', 'me'], data)
    },
  })
}

export const useDeleteUser = () => {
  return useMutation({
    mutationFn: async () => {
      await api.profile.deleteUser.$delete()
    },
  })
}

export const useUpdateDermoProfile = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UserDermoProfileUpdateInput) => {
      const res = await api.profile.dermo.$patch({ json: data })
      const json = await res.json()
      return json.data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['profile', 'dermo'], data)
    },
  })
}

export const privacySettingsQueries = {
  get: () =>
    queryOptions({
      queryKey: ['profile', 'privacy'],
      queryFn: async () => {
        const res = await api.profile['privacy-settings'].$get()
        const json = await res.json()
        if (!json.success) throw new Error('error' in json ? String(json.error) : 'Request failed')
        return json.data
      },
      staleTime: 1000 * 60 * 5,
    }),
}

export const useUpdatePrivacySettings = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdatePrivacySettingsInput) => {
      const res = await api.profile['privacy-settings'].$patch({ json: data })
      const json = await res.json()
      if (!json.success) throw new Error('error' in json ? String(json.error) : 'Request failed')
      return json.data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['profile', 'privacy'], data)
    },
  })
}
