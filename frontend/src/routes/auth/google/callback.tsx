import { createFileRoute } from '@tanstack/react-router'

import { AuthLayout } from '../../../component/Layout/AuthLayout/AuthLayout'
import { GoogleCallbackPage } from '../../../features/auth/page/GoogleCallbackPage/GoogleCallbackPage'

export const Route = createFileRoute('/auth/google/callback')({
  validateSearch: (search: Record<string, unknown>) => ({
    oauth: search.oauth === '1' || search.oauth === 1 ? true : undefined,
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
