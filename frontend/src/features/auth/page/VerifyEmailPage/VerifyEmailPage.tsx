import { useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect } from 'react'
import { toast } from 'sonner'

import { Button } from '../../../../component/Button/Button'
import { useResendVerification, useVerifyEmail } from '../../../../lib/queries/auth'

export const VerifyEmailPage = () => {
  const search = useSearch({ from: '/auth/verify-email' })
  const token = (search as Record<string, string>).token ?? ''
  const navigate = useNavigate()
  const verify = useVerifyEmail()
  const resend = useResendVerification()

  useEffect(() => {
    if (!token) return
    verify.mutate(token, {
      onSuccess: () => navigate({ to: '/collection' }),
    })
  }, [token, navigate, verify.mutate])

  if (!token) {
    return (
      <div className="auth-page__header">
        <h1 className="auth-page__title">Lien invalide</h1>
        <p className="auth-page__subtitle">Ce lien de vérification est invalide.</p>
      </div>
    )
  }

  if (verify.isPending) {
    return (
      <div className="auth-page__header">
        <output className="auth-page__subtitle">Vérification en cours...</output>
      </div>
    )
  }

  if (verify.isSuccess) return null

  if (verify.error?.message === 'token_expired') {
    return (
      <div className="auth-page__header">
        <h1 className="auth-page__title">Lien expiré</h1>
        <p className="auth-page__subtitle">Ce lien de vérification a expiré.</p>
        <Button
          type="button"
          variant="primary"
          fullWidth
          loading={resend.isPending}
          onClick={() =>
            resend.mutate(undefined, {
              onSuccess: () => toast.success('Email envoyé ! Vérifiez votre boîte mail.'),
              onError: () => toast.error("Impossible d'envoyer l'email, réessayez plus tard."),
            })
          }
        >
          Demander un nouveau lien
        </Button>
      </div>
    )
  }

  if (verify.isError) {
    return (
      <div className="auth-page__header">
        <h1 className="auth-page__title">Lien invalide</h1>
        <p className="auth-page__subtitle">Ce lien de vérification est invalide.</p>
      </div>
    )
  }

  return (
    <div className="auth-page__header">
      <output className="auth-page__subtitle">Vérification en cours...</output>
    </div>
  )
}
