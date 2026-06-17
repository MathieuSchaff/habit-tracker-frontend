import type {
  CatalogKind,
  CatalogQuality,
  CreateBanInput,
  ErrorGroupStatus,
  ErrorSource,
  ModerateContentInput,
  ModerateProfileInput,
  ModerationStatus,
  ModerationTarget,
  ReportStatus,
  ResolveErrorGroupInput,
  ResolveReportInput,
  ReviewRoleRequestInput,
  ReviewSuggestedEditInput,
  RoleRequestStatus,
  SecuritySeverity,
  SuggestedEditStatus,
  UpdateRoleInput,
} from '@aurore/shared'

import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { api } from '../api'
import { ApiError } from '../helpers/apiError'

const adminKeys = {
  all: ['admin'] as const,
  users: () => [...adminKeys.all, 'users'] as const,
  userBans: (userId: string) => [...adminKeys.all, 'users', userId, 'bans'] as const,
  reports: (status?: ReportStatus, escalated?: boolean) =>
    [...adminKeys.all, 'reports', { status, escalated }] as const,
  suggestedEdits: (status?: SuggestedEditStatus) =>
    [...adminKeys.all, 'suggested-edits', { status }] as const,
  roleRequests: (status?: RoleRequestStatus) =>
    [...adminKeys.all, 'role-requests', { status }] as const,
  preview: (target: ModerationTarget, id: string) =>
    [...adminKeys.all, 'preview', target, id] as const,
  catalogQueue: (kind: CatalogKind, quality?: CatalogQuality, status?: ModerationStatus) =>
    [...adminKeys.all, 'catalog-queue', { kind, quality, status }] as const,
  errors: (status?: ErrorGroupStatus, source?: ErrorSource) =>
    [...adminKeys.all, 'errors', { status, source }] as const,
  securityEvents: (severity?: SecuritySeverity) =>
    [...adminKeys.all, 'security-events', { severity }] as const,
  dashboard: () => [...adminKeys.all, 'dashboard'] as const,
}

export const adminQueries = {
  users: () =>
    queryOptions({
      queryKey: adminKeys.users(),
      queryFn: async () => {
        const res = await api.admin.users.$get()
        if (!res.ok) throw new ApiError('http_error', res.status)
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
        if (!res.ok) throw new ApiError('http_error', res.status)
        const json = await res.json()
        if (!json.success) throw new Error('User bans error')
        return json.data
      },
      enabled: !!userId,
    }),

  reports: (status?: ReportStatus, escalated?: boolean) =>
    queryOptions({
      queryKey: adminKeys.reports(status, escalated),
      queryFn: async () => {
        const query: Record<string, string> = {}
        if (status) query.status = status
        if (escalated) query.escalated = 'true'
        const res = await api.admin.reports.$get({ query })
        if (!res.ok) throw new ApiError('http_error', res.status)
        const json = await res.json()
        if (!json.success) throw new Error('Admin reports error')
        return json.data
      },
    }),

  suggestedEdits: (status?: SuggestedEditStatus) =>
    queryOptions({
      queryKey: adminKeys.suggestedEdits(status),
      queryFn: async () => {
        const query: Record<string, string> = {}
        if (status) query.status = status
        const res = await api.admin['suggested-edits'].$get({ query })
        if (!res.ok) throw new ApiError('http_error', res.status)
        const json = await res.json()
        if (!json.success) throw new Error('Suggested edits error')
        return json.data
      },
    }),

  roleRequests: (status?: RoleRequestStatus) =>
    queryOptions({
      queryKey: adminKeys.roleRequests(status),
      queryFn: async () => {
        const query: Record<string, string> = {}
        if (status) query.status = status
        const res = await api.admin['role-requests'].$get({ query })
        if (!res.ok) throw new ApiError('http_error', res.status)
        const json = await res.json()
        if (!json.success) throw new Error('Role requests error')
        return json.data
      },
    }),

  errors: (status?: ErrorGroupStatus, source?: ErrorSource) =>
    queryOptions({
      queryKey: adminKeys.errors(status, source),
      queryFn: async () => {
        const query: Record<string, string> = {}
        if (status) query.status = status
        if (source) query.source = source
        const res = await api.admin.errors.$get({ query })
        if (!res.ok) throw new ApiError('http_error', res.status)
        const json = await res.json()
        if (!json.success) throw new Error('Error groups error')
        return json.data
      },
    }),

  securityEvents: (severity?: SecuritySeverity) =>
    queryOptions({
      queryKey: adminKeys.securityEvents(severity),
      queryFn: async () => {
        const query: Record<string, string> = {}
        if (severity) query.severity = severity
        const res = await api.admin['security-events'].$get({ query })
        if (!res.ok) throw new ApiError('http_error', res.status)
        const json = await res.json()
        if (!json.success) throw new Error('Security events error')
        return json.data
      },
    }),

  dashboard: () =>
    queryOptions({
      queryKey: adminKeys.dashboard(),
      queryFn: async () => {
        const res = await api.admin.dashboard.$get()
        if (!res.ok) throw new ApiError('http_error', res.status)
        const json = await res.json()
        if (!json.success) throw new Error('Admin dashboard error')
        return json.data
      },
      staleTime: 30_000,
    }),

  catalogQueue: (kind: CatalogKind, quality?: CatalogQuality, status?: ModerationStatus) =>
    queryOptions({
      queryKey: adminKeys.catalogQueue(kind, quality, status),
      queryFn: async () => {
        const query: { kind: CatalogKind; quality?: CatalogQuality; status?: ModerationStatus } = {
          kind,
        }
        if (quality) query.quality = quality
        if (status) query.status = status
        const res = await api.admin.moderation.catalog.$get({ query })
        if (!res.ok) throw new ApiError('http_error', res.status)
        const json = await res.json()
        if (!json.success) throw new Error('Catalog queue error')
        return json.data
      },
      // Queue only changes when a moderator acts (which invalidates it explicitly);
      // suppress the default 0ms window-focus refetch mid-action.
      staleTime: 30_000,
    }),

  contentPreview: (target: ModerationTarget, id: string) =>
    queryOptions({
      queryKey: adminKeys.preview(target, id),
      queryFn: async () => {
        const res = await api.admin.moderation[target][':id'].$get({ param: { id } })
        if (!res.ok) throw new ApiError('http_error', res.status)
        const json = await res.json()
        if (!json.success) throw new Error('Content preview error')
        return json.data
      },
      enabled: !!id,
      // Short stale so toggling visible/hidden reflects immediately after moderation.
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

export function useDemoteToUser(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: UpdateRoleInput) => {
      const res = await api.admin.users[':id'].role.$patch({
        param: { id: userId },
        json: body,
      })
      if (!res.ok) {
        const json = (await res.json()) as { error?: string }
        throw new Error(json.error ?? 'Failed to update role')
      }
      const json = await res.json()
      if (!json.success) throw new Error('Update role error')
      return json.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.users() })
    },
  })
}

export function useResolveReport() {
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
    // Broad prefix: resolving from the escalated tab must also refresh that view; a status-only key would miss it.
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...adminKeys.all, 'reports'] })
    },
  })
}

export function useResolveErrorGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: ResolveErrorGroupInput }) => {
      const res = await api.admin.errors[':id'].$patch({ param: { id }, json: body })
      if (!res.ok) throw new Error('Failed to resolve error group')
      const json = await res.json()
      if (!json.success) throw new Error('Resolve error group error')
      return json.data
    },
    // Broad prefix: resolving from the open tab must also refresh the resolved tab (2-element partial key).
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...adminKeys.all, 'errors'] })
    },
  })
}

export function useEscalateReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.admin.reports[':id'].escalate.$patch({ param: { id } })
      if (!res.ok) throw new Error('Failed to escalate report')
      const json = await res.json()
      if (!json.success) throw new Error('Escalate report error')
      return json.data
    },
    // Broad prefix: refreshes all status/escalated views (2-element key partial match).
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...adminKeys.all, 'reports'] })
    },
  })
}

export function useReviewSuggestedEdit(statusFilter?: SuggestedEditStatus) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: ReviewSuggestedEditInput }) => {
      const res = await api.admin['suggested-edits'][':id'].$patch({ param: { id }, json: body })
      if (!res.ok) throw new Error('Failed to review suggested edit')
      const json = await res.json()
      if (!json.success) throw new Error('Review suggested edit error')
      return json.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.suggestedEdits(statusFilter) })
      qc.invalidateQueries({ queryKey: adminKeys.suggestedEdits() })
    },
  })
}

export function useReviewRoleRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: ReviewRoleRequestInput }) => {
      const res = await api.admin['role-requests'][':id'].$patch({ param: { id }, json: body })
      if (!res.ok) {
        const json = (await res.json()) as { error?: string }
        throw new Error(json.error ?? 'review_failed')
      }
      const json = await res.json()
      if (!json.success) throw new Error('review_failed')
      return json.data
    },
    onSuccess: () => {
      // Broad prefix: a decision moves a row between status tabs, so any cached
      // status view must refresh — a { status } key only deep-matches its own filter.
      qc.invalidateQueries({ queryKey: [...adminKeys.all, 'role-requests'] })
      // The dashboard's 5th card counts pending requests; refresh it after a decision.
      qc.invalidateQueries({ queryKey: adminKeys.dashboard() })
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
      target: ModerationTarget
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
      // Hiding/restoring shifts a product or ingredient between catalog queue views; no-op when no queue is mounted.
      qc.invalidateQueries({ queryKey: [...adminKeys.all, 'catalog-queue'] })
      // Owner's submissions dashboard renders the moderation badge + note; refresh it too (no-op when not mounted).
      qc.invalidateQueries({ queryKey: ['catalog-submissions', 'mine'] })
    },
  })
}

export function useVerifyCatalogItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ kind, id }: { kind: CatalogKind; id: string }) => {
      const route = kind === 'product' ? api.products : api.ingredients
      const res = await route[':id'].quality.$patch({
        param: { id },
        json: { quality: 'verified' },
      })
      if (!res.ok) throw new Error('Failed to verify catalog item')
      const json = await res.json()
      if (!json.success) throw new Error('Verify catalog error')
      return json.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...adminKeys.all, 'catalog-queue'] })
      // Verifying flips the owner's submissions badge to « Vérifiée ».
      qc.invalidateQueries({ queryKey: ['catalog-submissions', 'mine'] })
    },
  })
}
