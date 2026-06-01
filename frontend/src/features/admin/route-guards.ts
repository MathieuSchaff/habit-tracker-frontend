import { redirect } from '@tanstack/react-router'

import { useAuthStore } from '@/store/auth'

// Admin-only child routes of the shared /admin shell (dashboard, users). A
// contributor (« modérateur ») who reaches one by direct URL is sent to their
// report queue rather than an account/structure surface; a non-member goes home.
// ADR-0006 S1.
export function requireAdminOrRedirect() {
  const role = useAuthStore.getState().role
  if (role === 'admin') return
  throw redirect({ to: role === 'contributor' ? '/admin/reports' : '/' })
}

// Content-moderation child routes reachable by admin∨contributor. The user-detail page
// exposes a content-only ban slice to a contributor (« mettre en pause »); the account
// surface (email/role header, force-private, role revocation) is gated in the component.
// A non-member goes home. ADR-0006 S4.
export function requireModeratorOrRedirect() {
  const role = useAuthStore.getState().role
  if (role === 'admin' || role === 'contributor') return
  throw redirect({ to: '/' })
}
