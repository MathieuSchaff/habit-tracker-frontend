import { createFileRoute, redirect } from '@tanstack/react-router'

import { AuthLayout } from '@/component/Layout/AuthLayout/AuthLayout'
import { SignupPage } from '@/features/auth/page/SignupPage/SignupPage'

export const Route = createFileRoute('/auth/signup')({
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: '/' })
    }
  },
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
