import { createFileRoute, redirect } from '@tanstack/react-router'

import { AdminLayout } from '@/features/admin/components/AdminLayout'
import { useAuthStore } from '@/store/auth'

export const Route = createFileRoute('/admin')({
  beforeLoad: () => {
    // The /admin shell is shared by admin + contributor (« modérateur »); admin-only
    // surfaces (dashboard, users) gate themselves in their own child routes (ADR-0006 S1).
    const role = useAuthStore.getState().role
    if (role !== 'admin' && role !== 'contributor') throw redirect({ to: '/' })
  },
  component: AdminLayout,
})
