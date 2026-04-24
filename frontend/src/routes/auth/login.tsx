import { createFileRoute, redirect } from '@tanstack/react-router'

import { AuthLayout } from '@/component/Layout/AuthLayout/AuthLayout'
import { LoginPage } from '@/features/auth/page/LoginPage/LoginPage'

function sanitizeRedirect(url: unknown): string | undefined {
  if (typeof url !== 'string' || !url.startsWith('/') || url.startsWith('//')) return undefined
  return url
}

export const Route = createFileRoute('/auth/login')({
  validateSearch: (search) => ({
    redirect: sanitizeRedirect(search.redirect),
  }),
  beforeLoad: ({ context, search }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: search.redirect ?? '/' })
    }
  },
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
