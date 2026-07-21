import { createFileRoute } from '@tanstack/react-router'

import { AdminSecurityEventsPage } from '@/features/admin/components/AdminSecurityEventsPage'
import { requireAdminOrRedirect } from '@/features/admin/route-guards'
import { adminQueries } from '@/lib/queries/admin'

// Security feed is an ops surface, admin-only. Contributors hitting the URL directly get redirected.
export const Route = createFileRoute('/admin/security-events')({
  beforeLoad: requireAdminOrRedirect,
  loader: ({ context }) => context.queryClient.ensureQueryData(adminQueries.securityEvents()),
  component: AdminSecurityEventsPage,
})
