import { useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect } from 'react'
import { toast } from 'sonner'

import { useAuthStore } from '../../../../store/auth'

export const GoogleCallbackPage = () => {
  const navigate = useNavigate()
  const { oauth } = useSearch({ from: '/auth/google/callback' })

  useEffect(() => {
    const accessToken = useAuthStore.getState().accessToken

    if (accessToken) {
      navigate({ to: '/collection', replace: true })
      return
    }

    if (!oauth) {
      navigate({ to: '/auth/login', search: { redirect: undefined }, replace: true })
      return
    }

    toast.error('Connexion Google échouée, veuillez réessayer')
    navigate({ to: '/auth/login', search: { redirect: undefined }, replace: true })
  }, [oauth, navigate])

  return (
    <div className="auth-page__header">
      <output className="auth-page__subtitle">Connexion en cours...</output>
    </div>
  )
}
