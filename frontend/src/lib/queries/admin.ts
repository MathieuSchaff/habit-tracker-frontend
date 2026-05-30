import type {
  CreateBanInput,
  ModerateContentInput,
  ModerateProfileInput,
  ReportStatus,
  ResolveReportInput,
} from '@aurore/shared'

type ModerateTarget = 'reviews' | 'threads' | 'replies' | 'products' | 'ingredients'

import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '../api'

const adminKeys = {
  all: ['admin'] as const,
  users: () => [...adminKeys.all, 'users'] as const,
  userBans: (userId: string) => [...adminKeys.all, 'users', userId, 'bans'] as const,
  reports: (status?: ReportStatus) => [...adminKeys.all, 'reports', { status }] as const,
  preview: (target: ModerateTarget, id: string) =>
    [...adminKeys.all, 'preview', target, id] as const,
  dashboard: () => [...adminKeys.all, 'dashboard'] as const,
}

export const adminQueries = {
  users: () =>
    queryOptions({
      queryKey: adminKeys.users(),
      queryFn: async () => {
        const res = await api.admin.users.$get()
        if (!res.ok) throw new Error('Failed to fetch admin users list')
        const json = await res.json()
        if (!json.success) throw new Error('Admin users list error')
        return json.data
      },
    }),

  userBans: (userId: string) =>
    queryOptions({
      queryKey: adminKeys.userBans(userId),
      queryFn: async () => {
        const res = await api.admin.users[':id'].bans.$get({ param: { id: userId } })
        if (!res.ok) throw new Error('Failed to fetch user bans')
        const json = await res.json()
        if (!json.success) throw new Error('User bans error')
        return json.data
      },
      enabled: !!userId,
    }),

  reports: (status?: ReportStatus) =>
    queryOptions({
      queryKey: adminKeys.reports(status),
      queryFn: async () => {
        const query: Record<string, string> = {}
        if (status) query.status = status
        const res = await api.admin.reports.$get({ query })
        if (!res.ok) throw new Error('Failed to fetch admin reports')
        const json = await res.json()
        if (!json.success) throw new Error('Admin reports error')
        return json.data
      },
    }),

  dashboard: () =>
    queryOptions({
      queryKey: adminKeys.dashboard(),
      queryFn: async () => {
        const res = await api.admin.dashboard.$get()
        if (!res.ok) throw new Error('Failed to fetch admin dashboard')
        const json = await res.json()
        if (!json.success) throw new Error('Admin dashboard error')
        return json.data
      },
      staleTime: 30_000,
    }),

  contentPreview: (target: ModerateTarget, id: string) =>
    queryOptions({
      queryKey: adminKeys.preview(target, id),
      queryFn: async () => {
        const res = await api.admin.moderation[target][':id'].$get({ param: { id } })
        if (!res.ok) throw new Error('Failed to fetch content preview')
        const json = await res.json()
        if (!json.success) throw new Error('Content preview error')
        return json.data
      },
      enabled: !!id,
      // Preview is read-on-demand from the admin panel; cache briefly so
      // toggling visible/hidden via the moderate buttons reflects fast.
      staleTime: 5_000,
    }),
}

export function useCreateBan(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateBanInput) => {
      const res = await api.admin.users[':id'].bans.$post({
        param: { id: userId },
        json: body,
      })
      if (!res.ok) {
        const json = (await res.json()) as { error?: string }
        throw new Error(json.error ?? 'Failed to create ban')
      }
      const json = await res.json()
      if (!json.success) throw new Error('Create ban error')
      return json.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.userBans(userId) })
    },
  })
}

export function useLiftBan(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (banId: string) => {
      const res = await api.admin.bans[':banId'].$delete({ param: { banId } })
      if (!res.ok) throw new Error('Failed to lift ban')
      return banId
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.userBans(userId) })
    },
  })
}

export function useModerateProfileVisibility(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: ModerateProfileInput) => {
      const res = await api.admin.moderation.profiles[':userId'].visibility.$patch({
        param: { userId },
        json: body,
      })
      if (!res.ok) throw new Error('Failed to update profile visibility')
      const json = await res.json()
      if (!json.success) throw new Error('Moderate profile error')
      return json.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.users() })
    },
  })
}

export function useResolveReport(statusFilter?: ReportStatus) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: ResolveReportInput }) => {
      const res = await api.admin.reports[':id'].$patch({
        param: { id },
        json: body,
      })
      if (!res.ok) throw new Error('Failed to resolve report')
      const json = await res.json()
      if (!json.success) throw new Error('Resolve report error')
      return json.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.reports(statusFilter) })
      qc.invalidateQueries({ queryKey: adminKeys.reports() })
    },
  })
}

export function useModerateContent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      target,
      id,
      body,
    }: {
      target: ModerateTarget
      id: string
      body: ModerateContentInput
    }) => {
      const res = await api.admin.moderation[target][':id'].$patch({
        param: { id },
        json: body,
      })
      if (!res.ok) throw new Error('Failed to moderate content')
      const json = await res.json()
      if (!json.success) throw new Error('Moderate content error')
      return json.data
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: adminKeys.preview(vars.target, vars.id) })
    },
  })
}
