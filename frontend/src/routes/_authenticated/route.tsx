import { createFileRoute, Outlet } from '@tanstack/react-router'

import { DemoBanner } from '@/component/Feedback/app/DemoBanner/DemoBanner'
import { requireAuth } from '@/lib/auth/requireAuth'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context, location, preload }) => {
    if (preload) return
    await requireAuth({
      queryClient: context.queryClient,
      pathname: location.pathname,
      accessToken: context.auth.accessToken,
    })
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  return (
    <>
      <DemoBanner />
      <Outlet />
    </>
  )
}
