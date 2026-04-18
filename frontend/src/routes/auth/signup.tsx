import { createFileRoute } from '@tanstack/react-router'

import { AuthLayout } from '@/component/Layout/AuthLayout/AuthLayout'
import { SignupPage } from '@/features/auth/page/SignupPage/SignupPage'

export const Route = createFileRoute('/auth/signup')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <AuthLayout
      footer={{
        text: 'Déjà un compte ?',
        to: '/auth/login',
        label: 'Se connecter',
      }}
    >
      <SignupPage />
    </AuthLayout>
  )
}
