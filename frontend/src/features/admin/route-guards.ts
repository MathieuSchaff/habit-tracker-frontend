import { redirect } from '@tanstack/react-router'

import { awaitBootRefresh } from '@/lib/auth/awaitBootRefresh'
import type { RouterContext } from '@/routerContext'
import { useAuthStore } from '@/store/auth'

type GuardArgs = { context: RouterContext }

// Admin-only child routes of the shared /admin shell (dashboard, users). A
// contributor (« modérateur ») who reaches one by direct URL is sent to their
// report queue rather than an account/structure surface; a non-member goes home.
// Await the boot probe first so a cold-load hard nav reads the resolved role,
// not the default 'user'.
export async function requireAdminOrRedirect({ context }: GuardArgs) {
  await awaitBootRefresh(context.queryClient)
  const role = useAuthStore.getState().role
  if (role === 'admin') return
  throw redirect({ to: role === 'contributor' ? '/admin/reports' : '/' })
}

// Content-moderation child routes reachable by admin∨contributor. The user-detail page
// exposes a content-only ban slice to a contributor (« mettre en pause »); the account
// surface (email/role header, force-private, role revocation) is gated in the component.
// A non-member goes home.
export async function requireModeratorOrRedirect({ context }: GuardArgs) {
  await awaitBootRefresh(context.queryClient)
  const role = useAuthStore.getState().role
  if (role === 'admin' || role === 'contributor') return
  throw redirect({ to: '/' })
}
