import type { SubmitRoleRequestInput } from '@aurore/shared'

import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '../api'
import { ApiError } from '../helpers/apiError'

const roleRequestKeys = {
  mine: ['role-requests', 'me'] as const,
}

export const roleRequestQueries = {
  mine: () =>
    queryOptions({
      queryKey: roleRequestKeys.mine,
      queryFn: async () => {
        const res = await api['role-requests'].me.$get()
        if (!res.ok) throw new ApiError('http_error', res.status)
        const json = await res.json()
        if (!json.success) throw new Error('Role request error')
        return json.data
      },
    }),
}

export function useSubmitRoleRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: SubmitRoleRequestInput) => {
      const res = await api['role-requests'].$post({ json: body })
      if (!res.ok) {
        // Surface the API error code (already_pending / already_elevated) to the form.
        const json = (await res.json()) as { error?: string }
        throw new Error(json.error ?? 'submit_failed')
      }
      const json = await res.json()
      if (!json.success) throw new Error('submit_failed')
      return json.data
    },
    // Response is the new RoleRequestView (same shape as GET /me) — write it straight
    // to cache so the section flips to "pending" without a blank-form refetch flash.
    onSuccess: (data) => qc.setQueryData(roleRequestKeys.mine, data),
  })
}

export function useCancelRoleRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api['role-requests'][':id'].cancel.$post({ param: { id } })
      if (!res.ok) {
        const json = (await res.json()) as { error?: string }
        throw new Error(json.error ?? 'cancel_failed')
      }
      const json = await res.json()
      if (!json.success) throw new Error('cancel_failed')
      return json.data
    },
    onSuccess: (data) => qc.setQueryData(roleRequestKeys.mine, data),
  })
}
