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
        if (!res.ok) throw new Error('Failed to fetch profile')
        const json = await res.json()
        return json.data
      },
      retry: false,
    }),

  health: () =>
    queryOptions({
      queryKey: ['health'],
      queryFn: async () => {
        const res = await api.health.$get()
        if (!res.ok) throw new Error('Health check failed')
        const json = await res.json()
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
      if (!res.ok) throw new Error('Login failed')
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? 'Login failed')
      return json.data
    },
    onSuccess: (data) => {
      useAuthStore.getState().setAuth(data.accessToken, data.user)
      qc.setQueryData(['session'], { authenticated: true, userId: data.user.id })
    },
  })
}

export function useSignup() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await api.auth.signup.$post({ json: data })
      if (!res.ok) throw new Error('Signup failed')
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? 'Signup failed')
      return json.data
    },
    onSuccess: (data) => {
      useAuthStore.getState().setAuth(data.accessToken, data.user)
      qc.setQueryData(['session'], { authenticated: true, userId: data.user.id })
    },
  })
}

export function useLogout() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const res = await api.auth.logout.$post()
      if (!res.ok) throw new Error('Logout failed')
      return res.json()
    },
    onSuccess: () => {
      useAuthStore.getState().clearAuth()
      qc.removeQueries({ queryKey: ['session'] })
      qc.removeQueries({ queryKey: ['auth'] })
    },
  })
}
