import { type ResetPasswordErrorCode, resetPasswordFormSchema } from '@aurore/shared'

import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { Lock } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'react-hot-toast'

import { Button } from '../../../../component/Button/Button'
import { FormMessage } from '../../../../component/Feedback/ui/FormMessage/FormMessage'
import { useResetPassword } from '../../../../lib/queries/auth'
import { AuthField } from '../../components/AuthField/AuthField'
import { parseAuthForm } from '../../lib/parseAuthForm'

type FieldErrors = Partial<Record<'password' | 'confirmPassword' | 'form', string>>

/* Exhaustive map: TS errors if a ResetPasswordErrorCode is added without a label.
   Exported so tests assert the same string the user sees. */
export const RESET_ERRORS: Record<ResetPasswordErrorCode, string> = {
  invalid_token: 'Ce lien de réinitialisation est invalide ou a déjà été utilisé.',
  token_expired: 'Ce lien de réinitialisation a expiré. Demandez-en un nouveau.',
  server_error: 'Une erreur est survenue, réessayez plus tard',
}

export const ResetPasswordPage = () => {
  const { token = '' } = useSearch({ from: '/auth/reset-password' })
  const navigate = useNavigate()
  const reset = useResetPassword()

  const [errors, setErrors] = useState<FieldErrors>({})
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()

    const parsed = parseAuthForm(e.currentTarget, resetPasswordFormSchema)
    if (!parsed.ok) {
      setErrors({
        password: parsed.fieldErrors.password?.[0],
        confirmPassword: parsed.fieldErrors.confirmPassword?.[0],
      })
      return
    }

    setErrors({})
    reset.mutate(
      { token, password: parsed.data.password },
      {
        onSuccess: () => {
          toast.success('Mot de passe réinitialisé. Connectez-vous pour continuer.')
          // replace: the consumed token must not survive a back-navigation.
          navigate({ to: '/auth/login', search: { redirect: undefined }, replace: true })
        },
        onError: (error) => {
          const code = error.message as ResetPasswordErrorCode
          setErrors({ form: RESET_ERRORS[code] ?? RESET_ERRORS.server_error })
        },
      }
    )
  }

  if (!token) {
    return (
      <div className="auth-page__header">
        <h1 className="auth-page__title">Lien invalide</h1>
        <p className="auth-page__subtitle">Ce lien de réinitialisation est invalide.</p>
        <Link to="/auth/forgot-password" className="auth-form__forgot-link">
          Demander un nouveau lien
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="auth-page__header">
        <h1 className="auth-page__title">Nouveau mot de passe</h1>
        <p className="auth-page__subtitle">Choisissez un nouveau mot de passe pour votre compte</p>
      </div>

      <form
        className="auth-form"
        onSubmit={handleSubmit}
        noValidate
        aria-label="Formulaire de réinitialisation du mot de passe"
      >
        {errors.form && <FormMessage variant="error">{errors.form}</FormMessage>}
        {errors.form === RESET_ERRORS.token_expired && (
          <Link to="/auth/forgot-password" className="auth-form__forgot-link">
            Demander un nouveau lien
          </Link>
        )}

        <AuthField
          id="reset-password"
          name="password"
          label="Nouveau mot de passe"
          icon={<Lock size={18} />}
          placeholder="••••••••"
          error={errors.password}
          required
          autoComplete="new-password"
          passwordToggle
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <AuthField
          id="reset-confirm"
          name="confirmPassword"
          label="Confirmer le mot de passe"
          icon={<Lock size={18} />}
          placeholder="••••••••"
          error={errors.confirmPassword}
          required
          autoComplete="new-password"
          passwordToggle
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={reset.isPending}
          fullWidth
          className="auth-submit-btn"
        >
          Réinitialiser
        </Button>
      </form>
    </>
  )
}
