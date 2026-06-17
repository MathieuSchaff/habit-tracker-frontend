import { createFileRoute } from '@tanstack/react-router'

import { AuthLayout } from '@/component/Layout/AuthLayout/AuthLayout'
import { ForgotPasswordPage } from '@/features/auth/page/ForgotPasswordPage/ForgotPasswordPage'

export const Route = createFileRoute('/auth/forgot-password')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <AuthLayout
      footer={{ text: 'Retour à la connexion', to: '/auth/login', label: 'Se connecter' }}
    >
      <ForgotPasswordPage />
    </AuthLayout>
  )
}
