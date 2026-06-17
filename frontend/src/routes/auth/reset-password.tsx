import { createFileRoute } from '@tanstack/react-router'

import { AuthLayout } from '@/component/Layout/AuthLayout/AuthLayout'
import { ResetPasswordPage } from '@/features/auth/page/ResetPasswordPage/ResetPasswordPage'

export const Route = createFileRoute('/auth/reset-password')({
  validateSearch: (search): { token?: string } => ({
    token: typeof search.token === 'string' ? search.token : undefined,
  }),
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <AuthLayout
      footer={{ text: 'Retour à la connexion', to: '/auth/login', label: 'Se connecter' }}
    >
      <ResetPasswordPage />
    </AuthLayout>
  )
}
