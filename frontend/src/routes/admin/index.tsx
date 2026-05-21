import { createFileRoute } from '@tanstack/react-router'

import { AdminDashboardPage } from '@/features/admin/components/AdminDashboardPage'
import { adminQueries } from '@/lib/queries/admin'

export const Route = createFileRoute('/admin/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(adminQueries.dashboard()),
  component: AdminDashboardPage,
})
