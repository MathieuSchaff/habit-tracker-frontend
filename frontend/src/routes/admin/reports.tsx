import { createFileRoute } from '@tanstack/react-router'

import { AdminReportsPage } from '@/features/admin/components/AdminReportsPage'
import { adminQueries } from '@/lib/queries/admin'
import { useAuthStore } from '@/store/auth'

export const Route = createFileRoute('/admin/reports')({
  // The users() list is admin-only (GET /admin/users → 403 for a contributor), so
  // a moderator only prefetches the queue itself; their content-only view never
  // reads the list (ADR-0006 S1).
  loader: ({ context }) => {
    const tasks: Promise<unknown>[] = [
      context.queryClient.ensureQueryData(adminQueries.reports('open')),
    ]
    if (useAuthStore.getState().role === 'admin') {
      tasks.push(context.queryClient.ensureQueryData(adminQueries.users()))
    }
    return Promise.all(tasks)
  },
  component: AdminReportsPage,
})
