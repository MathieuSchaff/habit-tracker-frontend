import type { ApiSuccess, BrowserAuthResult } from '@habit-tracker/shared'

import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { useAuthStore } from '../../store/auth'
import { api } from '../api'

export const authQueries = {
  session: () =>
    queryOptions({
      queryKey: ['session'],
      queryFn: async () => {
        const res = await api.auth.session.$get()
        if (!res.ok) throw new Error('Not authenticated')
        const json = await res.json()
        if (!json.success) throw new Error('Not authenticated')

        return json.data
      },
      retry: false,
      staleTime: 1000 * 60 * 5,
    }),

  me: () =>
    queryOptions({
      queryKey: ['auth', 'me'],
      queryFn: async () => {
        const res = await api.profile.$get()
        const json = await res.json()
        if (!json.success) throw new Error(json.error)
        return json.data
      },
      retry: false,
    }),
  health: () =>
    queryOptions({
      queryKey: ['health'],
      queryFn: async () => {
        const res = await api.health.$get()
        const json = await res.json()
        if (!json.success) throw new Error(json.message ?? 'Health check failed')
        return json.data
      },
      retry: false,
    }),
}

export function useLogin() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await api.auth.login.$post({ json: data })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json as ApiSuccess<BrowserAuthResult>
    },
    onSuccess: ({ data }) => {
      useAuthStore.getState().setAuth(data.accessToken, data.user)

      qc.setQueryData(['session'], {
        success: true as const,
        data: { authenticated: true, userId: data.user.id },
      })
    },
  })
}

export function useSignup() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await api.auth.signup.$post({ json: data })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json as ApiSuccess<BrowserAuthResult>
    },
    onSuccess: ({ data }) => {
      useAuthStore.getState().setAuth(data.accessToken, data.user)

      qc.setQueryData(['session'], {
        success: true as const,
        data: { authenticated: true, userId: data.user.id },
      })
    },
  })
}

export function useLogout() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const res = await api.auth.logout.$post()
      return res.json()
    },
    onSuccess: () => {
      useAuthStore.getState().clearAuth()
      qc.removeQueries({ queryKey: ['session'] })
      qc.removeQueries({ queryKey: ['auth'] })
    },
  })
}
