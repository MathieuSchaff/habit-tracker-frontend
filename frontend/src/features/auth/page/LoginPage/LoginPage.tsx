import { type AuthInput, authSchema } from '@habit-tracker/shared'

import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Lock, Mail } from 'lucide-react'
import { useState } from 'react'
import z from 'zod'

import { Button } from '../../../../component/Button/Button'
import { FormMessage } from '../../../../component/Feedback/ui/FormMessage/FormMessage'
import { useLogin } from '../../../../lib/queries/auth'
import { AuthDivider } from '../../components/AuthDivider/AuthDivider'
import { AuthField } from '../../components/AuthField/AuthField'
import { DemoButton } from '../../components/DemoButton/DemoButton'
import { GoogleAuthButton } from '../../components/GoogleAuthButton/GoogleAuthButton'

type FieldErrors = Partial<Record<keyof AuthInput | 'form', string>>

export const LoginPage = () => {
  const [errors, setErrors] = useState<FieldErrors>({})

  const navigate = useNavigate()
  const { redirect } = useSearch({ from: '/auth/login' })
  const login = useLogin()
  const queryClient = useQueryClient()

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()

    const formData = Object.fromEntries(new FormData(e.currentTarget))
    const result = authSchema.safeParse(formData)

    if (!result.success) {
      const { fieldErrors } = z.flattenError(result.error)
      setErrors({
        email: fieldErrors.email?.[0],
        password: fieldErrors.password?.[0],
      })
      return
    }

    setErrors({})

    const LOGIN_ERRORS: Record<string, string> = {
      invalid_credentials: 'Email ou mot de passe incorrect',
      email_not_verified: "Votre adresse email n'est pas vérifiée",
      server_error: 'Une erreur est survenue, réessayez plus tard',
    }

    login.mutate(result.data, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['session'] })
        navigate({ to: redirect ?? '/collection' })
      },
      onError: (error) => {
        if (error.message === 'email_not_verified') {
          navigate({ to: '/auth/verify-pending' })
          return
        }
        setErrors({
          form: LOGIN_ERRORS[error.message] ?? 'Une erreur est survenue, réessaie plus tard',
        })
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
