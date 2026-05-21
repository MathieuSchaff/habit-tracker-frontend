import { createFileRoute, redirect } from '@tanstack/react-router'

import { AdminLayout } from '@/features/admin/components/AdminLayout'
import { useAuthStore } from '@/store/auth'

export const Route = createFileRoute('/admin')({
  beforeLoad: () => {
    if (!useAuthStore.getState().isAdmin) throw redirect({ to: '/' })
  },
  component: AdminLayout,
})
