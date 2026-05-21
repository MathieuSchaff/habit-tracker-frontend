import { createFileRoute } from '@tanstack/react-router'

import { AdminReportsPage } from '@/features/admin/components/AdminReportsPage'
import { adminQueries } from '@/lib/queries/admin'

export const Route = createFileRoute('/admin/reports')({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(adminQueries.reports('open')),
      context.queryClient.ensureQueryData(adminQueries.users()),
    ]),
  component: AdminReportsPage,
})
