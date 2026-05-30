import { createFileRoute } from '@tanstack/react-router'

import { AdminUserDetailPage } from '@/features/admin/components/AdminUserDetailPage'
import { requireAdminOrRedirect } from '@/features/admin/route-guards'
import { adminQueries } from '@/lib/queries/admin'

export const Route = createFileRoute('/admin/users_/$userId')({
  beforeLoad: requireAdminOrRedirect,
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(adminQueries.users()),
      context.queryClient.ensureQueryData(adminQueries.userBans(params.userId)),
    ]),
  component: AdminUserDetailPage,
})
