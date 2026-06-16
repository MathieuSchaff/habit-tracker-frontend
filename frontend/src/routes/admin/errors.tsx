import { createFileRoute } from '@tanstack/react-router'

import { AdminErrorsPage } from '@/features/admin/components/AdminErrorsPage'
import { requireAdminOrRedirect } from '@/features/admin/route-guards'
import { adminQueries } from '@/lib/queries/admin'

// Prod error tracker is an ops surface → admin-only; a contributor reaching it by URL is redirected.
export const Route = createFileRoute('/admin/errors')({
  beforeLoad: requireAdminOrRedirect,
  loader: ({ context }) => context.queryClient.ensureQueryData(adminQueries.errors('open')),
  component: AdminErrorsPage,
})
