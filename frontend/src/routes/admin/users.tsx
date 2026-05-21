import { createFileRoute } from '@tanstack/react-router'

import { AdminUsersPage } from '@/features/admin/components/AdminUsersPage'
import { adminQueries } from '@/lib/queries/admin'

export const Route = createFileRoute('/admin/users')({
  loader: ({ context }) => context.queryClient.ensureQueryData(adminQueries.users()),
  component: AdminUsersPage,
})
