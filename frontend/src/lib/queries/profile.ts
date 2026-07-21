import type {
  ProfileUpdateInput,
  UpdatePrivacySettingsInput,
  UserDermoProfileUpdateInput,
} from '@aurore/shared'

import { type QueryClient, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { useAuthStore } from '../../store/auth'
import { api } from '../api'
import { throwIfNotOk } from '../helpers/apiError'
import { downloadBlobAsFile, parseAttachmentFilename } from '../helpers/download'

export const profileQueries = {
  me: () =>
    queryOptions({
      queryKey: ['profile', 'me'],
      queryFn: async () => {
        const res = await api.profile.$get()
        await throwIfNotOk(res)
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
        await throwIfNotOk(res)
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
        await throwIfNotOk(res)
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
        await throwIfNotOk(res)
        const json = await res.json()
        if (!json.success) throw new Error('error' in json ? String(json.error) : 'Request failed')
        return json.data
      },
      staleTime: 1000 * 60,
      enabled: !!username,
    }),
  reviewsByUsername: (username: string) =>
    queryOptions({
      queryKey: ['profile', 'reviews', username],
      queryFn: async () => {
        const res = await api.profiles[':username'].reviews.$get({ param: { username } })
        await throwIfNotOk(res)
        const json = await res.json()
        if (!json.success) throw new Error('error' in json ? String(json.error) : 'Request failed')
        return json.data
      },
      staleTime: 1000 * 60,
      enabled: !!username,
    }),
  postsByUsername: (username: string) =>
    queryOptions({
      queryKey: ['profile', 'posts', username],
      queryFn: async () => {
        const res = await api.profiles[':username'].posts.$get({ param: { username } })
        await throwIfNotOk(res)
        const json = await res.json()
        if (!json.success) throw new Error('error' in json ? String(json.error) : 'Request failed')
        return json.data
      },
      staleTime: 1000 * 60,
      enabled: !!username,
    }),
}

// Seeds from cache (may be undefined), then for an authenticated visitor either blocks on a
// fresh dermo fetch (personalization filter on) or warms the cache in the background. A failed
// fetch under an active filter must not blank the whole catalogue: fall back to the cached
// profile (or none) and let the list render — deriveAvoidFor tolerates null/undefined → no exclusions.
export async function resolveDermoForList(
  qc: QueryClient,
  userId: string | null,
  profileFilter?: boolean
) {
  let dermo = qc.getQueryData(profileQueries.dermo().queryKey)
  if (!userId) return dermo
  if (profileFilter) {
    dermo = await qc.ensureQueryData(profileQueries.dermo()).catch(() => dermo)
  } else {
    void qc.prefetchQuery(profileQueries.dermo())
  }
  return dermo
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
      if (!json.success) throw new Error('error' in json ? String(json.error) : 'Request failed')
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
        await throwIfNotOk(res)
        const json = await res.json()
        if (!json.success) throw new Error('error' in json ? String(json.error) : 'Request failed')
        return json.data
      },
      staleTime: 1000 * 60 * 5,
    }),
}

const PRIVACY_UPDATE_KEY = ['profile', 'privacy', 'update']

export const useUpdatePrivacySettings = () => {
  const queryClient = useQueryClient()
  const key = privacySettingsQueries.get().queryKey

  return useMutation({
    mutationKey: PRIVACY_UPDATE_KEY,
    mutationFn: async (data: UpdatePrivacySettingsInput) => {
      const res = await api.profile['privacy-settings'].$patch({ json: data })
      const json = await res.json()
      if (!json.success) throw new Error('error' in json ? String(json.error) : 'Request failed')
      return json.data
    },
    // Optimistic: a privacy toggle must feel instant. Snapshot for rollback, merge the changed flag.
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData(key)
      queryClient.setQueryData(key, (old) => (old ? ({ ...old, ...data } as typeof old) : old))
      return { previous }
    },
    onError: (_err, _data, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    // Reconcile only once the last in-flight toggle settles: concurrent toggles each return a full
    // row, so trusting any single response could clobber a sibling's optimistic change.
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: PRIVACY_UPDATE_KEY }) === 1) {
        queryClient.invalidateQueries({ queryKey: key })
      }
    },
    meta: { errorMessage: 'Mise à jour de la confidentialité impossible.' },
  })
}

// GDPR Art. 20 portability: fresh server dump on every call, never cached (no focus/reconnect refetch).
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
