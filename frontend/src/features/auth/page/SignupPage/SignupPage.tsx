import { type SignupErrorCode, type SignupFormInput, signupSchema } from '@habit-tracker/shared'

import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Check, Lock, Mail, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '../../../../component/Button/Button'
import { FormMessage } from '../../../../component/Feedback/ui/FormMessage/FormMessage'
import { useSignup } from '../../../../lib/queries/auth'
import { AuthDivider } from '../../components/AuthDivider/AuthDivider'
import { AuthField } from '../../components/AuthField/AuthField'
import { DemoButton } from '../../components/DemoButton/DemoButton'
import { GoogleAuthButton } from '../../components/GoogleAuthButton/GoogleAuthButton'
import { parseAuthForm } from '../../lib/parseAuthForm'

type FieldErrors = Partial<Record<keyof SignupFormInput | 'form', string>>

/* Exhaustive map: TS errors if a SignupErrorCode is added without a label here. */
const SIGNUP_ERRORS: Record<SignupErrorCode, string> = {
  email_exists: 'Un compte existe déjà avec cet email',
  server_error: 'Une erreur est survenue, réessayez plus tard',
}

const PASSWORD_RULES = [
  { key: 'length', label: '8 caractères minimum', test: (v: string) => v.length >= 8 },
  { key: 'lower', label: 'Une minuscule (a-z)', test: (v: string) => /[a-z]/.test(v) },
  { key: 'upper', label: 'Une majuscule (A-Z)', test: (v: string) => /[A-Z]/.test(v) },
  { key: 'number', label: 'Un chiffre (0-9)', test: (v: string) => /[0-9]/.test(v) },
  { key: 'special', label: 'Un caractère spécial', test: (v: string) => /[^a-zA-Z0-9]/.test(v) },
] as const

export const SignupPage = () => {
  const [errors, setErrors] = useState<FieldErrors>({})
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const navigate = useNavigate()
  const signup = useSignup()
  const queryClient = useQueryClient()

  const passwordChecks = useMemo(
    () => PASSWORD_RULES.map((rule) => ({ ...rule, valid: rule.test(password) })),
    [password]
  )

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()

    const parsed = parseAuthForm(e.currentTarget, signupSchema)
    if (!parsed.ok) {
      setErrors({
        email: parsed.fieldErrors.email?.[0],
        password: parsed.fieldErrors.password?.[0],
        confirmPassword: parsed.fieldErrors.confirmPassword?.[0],
      })
      return
    }

    setErrors({})

    // confirmPassword is UI-only — don't ship it to the backend.
    const { confirmPassword: _confirm, ...payload } = parsed.data
    signup.mutate(payload, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['session'] })
        navigate({ to: '/collection' })
      },
      onError: (error) => {
        const code = error.message as SignupErrorCode
        setErrors({ form: SIGNUP_ERRORS[code] ?? SIGNUP_ERRORS.server_error })
      },
    })
  }

  return (
    <>
      <div className="auth-page__header">
        <h1 className="auth-page__title">Créer un compte</h1>
        <p className="auth-page__subtitle">Commencez à suivre vos habitudes</p>
      </div>

      <form
        className="auth-form"
        onSubmit={handleSubmit}
        noValidate
        aria-label="Formulaire d'inscription"
      >
        {errors.form && <FormMessage variant="error">{errors.form}</FormMessage>}

        <AuthField
          id="signup-email"
          name="email"
          type="email"
          label="Email"
          icon={<Mail size={18} />}
          placeholder="nom@exemple.com"
          error={errors.email}
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <AuthField
          id="signup-password"
          name="password"
          label="Mot de passe"
          icon={<Lock size={18} />}
          placeholder="••••••••"
          error={errors.password}
          required
          autoComplete="new-password"
          passwordToggle
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <ul className="signup__rules" aria-label="Règles du mot de passe">
          {passwordChecks.map(({ key, label, valid }) => (
            <li
              key={key}
              className={`signup__rule ${valid ? 'signup__rule--valid' : ''}`}
              aria-label={`${label} : ${valid ? 'validé' : 'non validé'}`}
            >
              {valid ? (
                <Check size={14} className="signup__rule-icon" aria-hidden="true" />
              ) : (
                <X size={14} className="signup__rule-icon" aria-hidden="true" />
              )}
              {label}
            </li>
          ))}
        </ul>

        <AuthField
          id="signup-confirm"
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

        {confirmPassword.length > 0 && (
          <output
            className={`signup__rule ${password === confirmPassword ? 'signup__rule--valid' : ''}`}
            aria-label={`Les mots de passe correspondent : ${password === confirmPassword ? 'validé' : 'non validé'}`}
          >
            {password === confirmPassword ? (
              <Check size={14} className="signup__rule-icon" aria-hidden="true" />
            ) : (
              <X size={14} className="signup__rule-icon" aria-hidden="true" />
            )}
            Les mots de passe correspondent
          </output>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={signup.isPending}
          fullWidth
          className="auth-submit-btn"
        >
          Créer mon compte
        </Button>

        <AuthDivider />
        <DemoButton />
      </form>

      <AuthDivider />
      <GoogleAuthButton label="S'inscrire avec Google" />
    </>
  )
}
