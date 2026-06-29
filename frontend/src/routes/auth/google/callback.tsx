import { createFileRoute } from '@tanstack/react-router'

import { AuthLayout } from '../../../component/Layout/AuthLayout/AuthLayout'
import { GoogleCallbackPage } from '../../../features/auth/page/GoogleCallbackPage/GoogleCallbackPage'

export const Route = createFileRoute('/auth/google/callback')({
  // Must stay idempotent: TanStack serializes the validated value back into the URL and
  // re-validates it, so `true` (our own output) has to map to `true` too — otherwise the
  // second pass drops oauth and the callback page reads an empty search.
  validateSearch: (search: Record<string, unknown>) => ({
    oauth: search.oauth === true || search.oauth === '1' || search.oauth === 1 ? true : undefined,
  }),
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <AuthLayout>
      <GoogleCallbackPage />
    </AuthLayout>
  )
}
