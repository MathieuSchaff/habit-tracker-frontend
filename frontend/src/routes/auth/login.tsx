import { createFileRoute } from '@tanstack/react-router'

import { AuthLayout } from '@/component/Layout/AuthLayout/AuthLayout'
import { LoginPage } from '@/features/auth/page/LoginPage/LoginPage'

export const Route = createFileRoute('/auth/login')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <AuthLayout
      footer={{
        text: 'Pas encore de compte?',
        to: '/auth/signup',
        label: `S'enregistrer`,
      }}
    >
      <LoginPage />
    </AuthLayout>
  )
}
