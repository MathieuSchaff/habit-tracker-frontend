import { type AuthInput, authSchema, type LoginErrorCode } from '@habit-tracker/shared'

import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Lock, Mail } from 'lucide-react'
import { useState } from 'react'

import { Button } from '../../../../component/Button/Button'
import { FormMessage } from '../../../../component/Feedback/ui/FormMessage/FormMessage'
import { useLogin } from '../../../../lib/queries/auth'
import { AuthDivider } from '../../components/AuthDivider/AuthDivider'
import { AuthField } from '../../components/AuthField/AuthField'
import { DemoButton } from '../../components/DemoButton/DemoButton'
import { GoogleAuthButton } from '../../components/GoogleAuthButton/GoogleAuthButton'
import { parseAuthForm } from '../../lib/parseAuthForm'

type FieldErrors = Partial<Record<keyof AuthInput | 'form', string>>

/* Exhaustive map: TS errors if a LoginErrorCode is added without a label here. */
const LOGIN_ERRORS: Record<LoginErrorCode, string> = {
  invalid_credentials: 'Email ou mot de passe incorrect',
  email_not_verified: "Votre adresse email n'est pas vérifiée",
  server_error: 'Une erreur est survenue, réessayez plus tard',
}

export const LoginPage = () => {
  const [errors, setErrors] = useState<FieldErrors>({})

  const navigate = useNavigate()
  const { redirect } = useSearch({ from: '/auth/login' })
  const login = useLogin()
  const queryClient = useQueryClient()

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()

    const parsed = parseAuthForm(e.currentTarget, authSchema)
    if (!parsed.ok) {
      setErrors({
        email: parsed.fieldErrors.email?.[0],
        password: parsed.fieldErrors.password?.[0],
      })
      return
    }

    setErrors({})

    login.mutate(parsed.data, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['session'] })
        navigate({ to: redirect ?? '/collection' })
      },
      onError: (error) => {
        if (error.message === 'email_not_verified') {
          navigate({ to: '/auth/verify-pending' })
          return
        }
        const code = error.message as LoginErrorCode
        setErrors({ form: LOGIN_ERRORS[code] ?? LOGIN_ERRORS.server_error })
      },
    })
  }

  return (
    <>
      <div className="auth-page__header">
        <h1 className="auth-page__title">Connexion</h1>
        <p className="auth-page__subtitle">Content de vous revoir sur Aurore</p>
      </div>

      <form
        className="auth-form"
        onSubmit={handleSubmit}
        noValidate
        aria-label="Formulaire de connexion"
      >
        {errors.form && <FormMessage variant="error">{errors.form}</FormMessage>}

        <AuthField
          id="login-email"
          name="email"
          type="email"
          label="Email"
          icon={<Mail size={18} />}
          placeholder="nom@exemple.com"
          error={errors.email}
          required
          autoComplete="email"
        />

        <AuthField
          id="login-password"
          name="password"
          label="Mot de passe"
          icon={<Lock size={18} />}
          placeholder="••••••••"
          error={errors.password}
          required
          autoComplete="current-password"
          passwordToggle
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={login.isPending}
          fullWidth
          className="auth-submit-btn"
        >
          Se connecter
        </Button>

        <AuthDivider />
        <DemoButton />
      </form>

      <AuthDivider />
      <GoogleAuthButton label="Se connecter avec Google" />
    </>
  )
}
