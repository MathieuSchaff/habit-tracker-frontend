import type {
  ProfileUpdateInput,
  UpdatePrivacySettingsInput,
  UserDermoProfileUpdateInput,
} from '@habit-tracker/shared'

import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { useAuthStore } from '../../store/auth'
import { api } from '../api'
import { downloadBlobAsFile, parseAttachmentFilename } from '../helpers/download'

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
        if (!json.success) throw new Error('error' in json ? String(json.error) : 'Request failed')
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
        if (!json.success) throw new Error('error' in json ? String(json.error) : 'Request failed')
        return json.data
      },
      staleTime: 1000 * 60 * 5,
    }),
  publicByUsername: (username: string) =>
    queryOptions({
      queryKey: ['profile', 'public', username],
      queryFn: async () => {
        const res = await api.profiles[':username'].public.$get({ param: { username } })
        const json = await res.json()
        if (!json.success) throw new Error('error' in json ? String(json.error) : 'Request failed')
        return json.data
      },
      staleTime: 1000 * 60,
      enabled: !!username,
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
    meta: { errorMessage: 'Mise à jour du profil impossible.' },
  })
}

export const useDeleteUser = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await api.profile.deleteUser.$delete()
    },
    // Mirror logout teardown: without this the store keeps the access token, so
    // the post-delete redirect to /auth/login bounces back to / as "authenticated".
    onSuccess: () => {
      useAuthStore.getState().clearAuth()
      queryClient.clear()
    },
    meta: { errorMessage: 'Suppression du compte impossible.' },
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
    meta: { errorMessage: 'Mise à jour du profil dermo impossible.' },
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
    meta: { errorMessage: 'Mise à jour de la confidentialité impossible.' },
  })
}

// RGPD Article 20 portability. The download is a side-effect mutation, not a
// cacheable query: every call is a fresh server-side dump, and we never want
// React Query to re-issue it on focus/reconnect.
export class ExportRateLimitError extends Error {
  retryAfterSec: number
  constructor(retryAfterSec: number) {
    super('rate_limit_exceeded')
    this.name = 'ExportRateLimitError'
    this.retryAfterSec = retryAfterSec
  }
}

export const useDownloadDataExport = () => {
  return useMutation({
    mutationFn: async () => {
      const res = await api.profile.export.$get()

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string
          details?: { retryAfter?: number }
        } | null
        if (body?.error === 'rate_limit_exceeded') {
          throw new ExportRateLimitError(body.details?.retryAfter ?? 300)
        }
        throw new Error(body?.error ?? 'export_failed')
      }

      const blob = await res.blob()
      const filename =
        parseAttachmentFilename(res.headers.get('Content-Disposition')) ?? 'aurore-export.json'
      downloadBlobAsFile(blob, filename)
    },
    meta: { errorMessage: "Téléchargement de l'export impossible." },
  })
}
