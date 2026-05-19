import { useNavigate, useSearch } from '@tanstack/react-router'

import { Button } from '../../../../component/Button/Button'
import { formatInstant } from '../../../../lib/dates'
import { useLogout } from '../../../../lib/queries/auth'

export const BannedPage = () => {
  const { reason, expires } = useSearch({ from: '/auth/banned' })
  const logout = useLogout()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSettled: () => navigate({ to: '/auth/login', search: { redirect: undefined } }),
    })
  }

  return (
    <div className="auth-page__header">
      <h1 className="auth-page__title">Compte suspendu</h1>
      <p className="auth-page__subtitle">
        {expires
          ? `Votre compte est suspendu jusqu'au ${formatInstant(expires, 'long')}.`
          : 'Votre compte est suspendu.'}
      </p>
      {reason ? (
        <p className="auth-page__subtitle">{reason}</p>
      ) : (
        <p className="auth-page__subtitle">Pour toute question, contactez le support.</p>
      )}
      <Button
        type="button"
        variant="primary"
        fullWidth
        loading={logout.isPending}
        onClick={handleLogout}
      >
        Se déconnecter
      </Button>
    </div>
  )
}
