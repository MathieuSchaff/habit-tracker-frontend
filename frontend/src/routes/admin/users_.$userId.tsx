import { createFileRoute } from '@tanstack/react-router'

import { AdminUserDetailPage } from '@/features/admin/components/AdminUserDetailPage'
import { requireModeratorOrRedirect } from '@/features/admin/route-guards'
import { adminQueries } from '@/lib/queries/admin'
import { useAuthStore } from '@/store/auth'

export const Route = createFileRoute('/admin/users_/$userId')({
  beforeLoad: requireModeratorOrRedirect,
  // users() is admin-only (403 for a contributor); a moderator only prefetches the
  // target's bans for the content-only slice (ADR-0006 S4).
  loader: ({ context, params }) => {
    const tasks: Promise<unknown>[] = [
      context.queryClient.ensureQueryData(adminQueries.userBans(params.userId)),
    ]
    if (useAuthStore.getState().role === 'admin') {
      tasks.push(context.queryClient.ensureQueryData(adminQueries.users()))
    }
    return Promise.all(tasks)
  },
  component: AdminUserDetailPage,
})
