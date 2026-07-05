import { createFileRoute } from '@tanstack/react-router'

import { AdminUserDetailPage } from '@/features/admin/components/AdminUserDetailPage'
import { requireModeratorOrRedirect } from '@/features/admin/route-guards'
import { adminQueries } from '@/lib/queries/admin'
import { useAuthStore } from '@/store/auth'

export const Route = createFileRoute('/admin/users_/$userId')({
  beforeLoad: requireModeratorOrRedirect,
  // userBans is the mandatory entity (content-only slice). users() is admin-only PII
  // enrichment (403 for a contributor); prefetchQuery, not ensureQueryData, so a failed
  // enrichment degrades in-page (page reads it via useQuery, `!user` fallback), not fatal.
  loader: ({ context, params }) => {
    const tasks: Promise<unknown>[] = [
      context.queryClient.ensureQueryData(adminQueries.userBans(params.userId)),
    ]
    if (useAuthStore.getState().role === 'admin') {
      tasks.push(context.queryClient.prefetchQuery(adminQueries.users()))
    }
    return Promise.all(tasks)
  },
  component: AdminUserDetailPage,
})
