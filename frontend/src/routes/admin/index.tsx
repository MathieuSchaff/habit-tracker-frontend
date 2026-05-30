import { createFileRoute } from '@tanstack/react-router'

import { AdminDashboardPage } from '@/features/admin/components/AdminDashboardPage'
import { requireAdminOrRedirect } from '@/features/admin/route-guards'
import { adminQueries } from '@/lib/queries/admin'

export const Route = createFileRoute('/admin/')({
  beforeLoad: requireAdminOrRedirect,
  loader: ({ context }) => context.queryClient.ensureQueryData(adminQueries.dashboard()),
  component: AdminDashboardPage,
})
