import { createFileRoute } from '@tanstack/react-router'

import { AdminReportsPage } from '@/features/admin/components/AdminReportsPage'
import { adminQueries } from '@/lib/queries/admin'
import { useAuthStore } from '@/store/auth'

export const Route = createFileRoute('/admin/reports')({
  // users() is reporter/target PII enrichment, admin-only (403 for a moderator).
  // prefetchQuery, not ensureQueryData: a failed enrichment fetch must degrade in-page
  // (AdminReportsPage reads it via useQuery, `?? []`), not kill the reports queue (ADR-0006 S1).
  loader: ({ context }) => {
    const tasks: Promise<unknown>[] = [
      context.queryClient.ensureQueryData(adminQueries.reports('open')),
    ]
    if (useAuthStore.getState().role === 'admin') {
      tasks.push(context.queryClient.prefetchQuery(adminQueries.users()))
    }
    return Promise.all(tasks)
  },
  component: AdminReportsPage,
})
