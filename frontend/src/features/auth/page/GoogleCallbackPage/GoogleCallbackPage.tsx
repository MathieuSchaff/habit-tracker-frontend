import { useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect } from 'react'
import { toast } from 'sonner'

import { useAuthStore } from '../../../../store/auth'

export const GoogleCallbackPage = () => {
  const navigate = useNavigate()
  const { token } = useSearch({ from: '/auth/google/callback' })

  useEffect(() => {
    // Read at effect execution time, not render time
    const accessToken = useAuthStore.getState().accessToken

    if (accessToken) {
      navigate({ to: '/collection', replace: true })
      return
    }

    // No token param = direct navigation, not a failed OAuth — redirect silently
    if (!token) {
      navigate({ to: '/auth/login', replace: true })
      return
    }

    // OAuth came from Google (token param present) but silentRefresh failed
    toast.error('Connexion Google échouée, veuillez réessayer')
    navigate({ to: '/auth/login', replace: true })
  }, [token, navigate])

  return (
    <div className="auth-page__header">
      <output className="auth-page__subtitle">Connexion en cours...</output>
    </div>
  )
}
