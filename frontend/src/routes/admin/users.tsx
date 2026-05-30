import { createFileRoute } from '@tanstack/react-router'

import { AdminUsersPage } from '@/features/admin/components/AdminUsersPage'
import { requireAdminOrRedirect } from '@/features/admin/route-guards'
import { adminQueries } from '@/lib/queries/admin'

export const Route = createFileRoute('/admin/users')({
  beforeLoad: requireAdminOrRedirect,
  loader: ({ context }) => context.queryClient.ensureQueryData(adminQueries.users()),
  component: AdminUsersPage,
})
