import type { UpdateUserPreferencesInput } from '@habit-tracker/shared'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '../api'

export const userPreferenceKeys = {
  all: ['user-preferences'] as const,
}

export const userPreferenceQueries = {
  get: () => ({
    queryKey: userPreferenceKeys.all,
    queryFn: async () => {
      const res = await api.profile.preferences.$get()
      if (!res.ok) throw new Error('Failed to fetch preferences')
      const data = await res.json()
      return data.data
    },
  }),
}

export const useUpdateUserPreferences = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateUserPreferencesInput) => {
      const res = await api.profile.preferences.$patch({ json: input })
      if (!res.ok) throw new Error('Failed to update preferences')
      const data = await res.json()
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userPreferenceKeys.all })
    },
  })
}
