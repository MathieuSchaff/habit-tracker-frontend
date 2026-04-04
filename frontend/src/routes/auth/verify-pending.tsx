import { createFileRoute } from '@tanstack/react-router'

import { AuthLayout } from '@/component/Layout/AuthLayout/AuthLayout'
import { VerifyPendingPage } from '@/features/auth/components/VerifyPendingPage/VerifyPendingPage'

export const Route = createFileRoute('/auth/verify-pending')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <AuthLayout
      footer={{ text: 'Retour à la connexion', to: '/auth/login', label: 'Se connecter' }}
    >
      <VerifyPendingPage />
    </AuthLayout>
  )
}
