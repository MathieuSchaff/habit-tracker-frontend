import { createFileRoute } from '@tanstack/react-router'

import { AuthLayout } from '@/component/Layout/AuthLayout/AuthLayout'
import { BannedPage } from '@/features/auth/page/BannedPage/BannedPage'

export const Route = createFileRoute('/auth/banned')({
  validateSearch: (search) => ({
    reason: typeof search.reason === 'string' ? search.reason : undefined,
    expires: typeof search.expires === 'string' ? search.expires : undefined,
  }),
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <AuthLayout>
      <BannedPage />
    </AuthLayout>
  )
}
