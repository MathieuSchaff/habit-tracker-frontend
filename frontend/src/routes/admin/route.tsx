import { createFileRoute, redirect } from '@tanstack/react-router'

import { AdminLayout } from '@/features/admin/components/AdminLayout'
import { awaitBootRefresh } from '@/lib/auth/awaitBootRefresh'
import { useAuthStore } from '@/store/auth'

export const Route = createFileRoute('/admin')({
  beforeLoad: async ({ context }) => {
    // The /admin shell is shared by admins and contributors; admin-only
    // surfaces gate themselves in their own child routes.
    // Await the boot probe first so a cold-load hard nav reads the resolved role, not the
    // default 'user'. Otherwise an admin/contributor would get ejected here.
    await awaitBootRefresh(context.queryClient)
    const role = useAuthStore.getState().role
    if (role !== 'admin' && role !== 'contributor') throw redirect({ to: '/' })
  },
  component: AdminLayout,
})
