import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect } from 'react'
import { toast } from 'react-hot-toast'

import { ensureFresh } from '../../../../lib/auth/freshness'
import { useAuthStore } from '../../../../store/auth'

export const GoogleCallbackPage = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { oauth } = useSearch({ from: '/auth/google/callback' })

  useEffect(() => {
    let cancelled = false

    const goLogin = () =>
      navigate({ to: '/auth/login', search: { redirect: undefined }, replace: true })

    const complete = async () => {
      if (useAuthStore.getState().accessToken) {
        navigate({ to: '/collection', replace: true })
        return
      }

      if (!oauth) {
        goLogin()
        return
      }

      // The backend set the refresh cookie before redirecting here; trade it for an access
      // token before deciding. ensureFresh is deduped, so this joins the boot probe already
      // in flight rather than reading an empty store and bouncing to login.
      const result = await ensureFresh(queryClient)
      if (cancelled) return

      if (result === 'ok' || useAuthStore.getState().accessToken) {
        navigate({ to: '/collection', replace: true })
        return
      }

      toast.error('Connexion Google échouée, veuillez réessayer')
      goLogin()
    }

    void complete()
    return () => {
      cancelled = true
    }
  }, [oauth, navigate, queryClient])

  return (
    <div className="auth-page__header">
      <output className="auth-page__subtitle">Connexion en cours…</output>
    </div>
  )
}
