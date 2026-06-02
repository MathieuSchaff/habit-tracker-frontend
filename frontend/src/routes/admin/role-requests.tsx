import { createFileRoute } from '@tanstack/react-router'

import { AdminRoleRequestsPage } from '@/features/admin/components/AdminRoleRequestsPage'
import { requireAdminOrRedirect } from '@/features/admin/route-guards'
import { adminQueries } from '@/lib/queries/admin'

// Account elevation is admin-only; a contributor reaching this by URL is redirected (ADR-0006).
export const Route = createFileRoute('/admin/role-requests')({
  beforeLoad: requireAdminOrRedirect,
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(adminQueries.roleRequests('pending')),
  component: AdminRoleRequestsPage,
})
