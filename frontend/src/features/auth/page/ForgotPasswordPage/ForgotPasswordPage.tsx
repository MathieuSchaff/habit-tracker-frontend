import { forgotPasswordSchema } from '@aurore/shared'

import { Mail } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '../../../../component/Button/Button'
import { FormMessage } from '../../../../component/Feedback/ui/FormMessage/FormMessage'
import { useForgotPassword } from '../../../../lib/queries/auth'
import { AuthField } from '../../components/AuthField/AuthField'
import { parseAuthForm } from '../../lib/parseAuthForm'

type FieldErrors = Partial<Record<'email' | 'form', string>>

export const ForgotPasswordPage = () => {
  const [errors, setErrors] = useState<FieldErrors>({})
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const confirmationRef = useRef<HTMLHeadingElement>(null)

  const forgot = useForgotPassword()

  // The form is swapped out in place (no route change), so move focus to the
  // confirmation heading or screen-reader users get no signal the action landed.
  useEffect(() => {
    if (submitted) confirmationRef.current?.focus()
  }, [submitted])

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()

    const parsed = parseAuthForm(e.currentTarget, forgotPasswordSchema)
    if (!parsed.ok) {
      setErrors({ email: parsed.fieldErrors.email?.[0] })
      return
    }

    setErrors({})
    forgot.mutate(parsed.data, {
      // Neutral flow (ADR 0010): the response is identical whether or not the email
      // exists, so we always land on the same confirmation screen.
      onSuccess: () => setSubmitted(true),
      onError: () => setErrors({ form: 'Une erreur est survenue, réessayez plus tard' }),
    })
  }

  if (submitted) {
    return (
      <div className="auth-page__header">
        <h1 className="auth-page__title" ref={confirmationRef} tabIndex={-1}>
          Vérifiez votre email
        </h1>
        <p className="auth-page__subtitle">
          Si un compte existe avec cette adresse, un lien de réinitialisation vient d'être envoyé.
          Cliquez dessus pour choisir un nouveau mot de passe.
        </p>
        <p className="auth-page__subtitle">Le lien expire dans 1 heure.</p>
      </div>
    )
  }

  return (
    <>
      <div className="auth-page__header">
        <h1 className="auth-page__title">Mot de passe oublié</h1>
        <p className="auth-page__subtitle">
          Entrez votre email pour recevoir un lien de réinitialisation
        </p>
      </div>

      <form
        className="auth-form"
        onSubmit={handleSubmit}
        noValidate
        aria-label="Formulaire de mot de passe oublié"
      >
        {errors.form && <FormMessage variant="error">{errors.form}</FormMessage>}

        <AuthField
          id="forgot-email"
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

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={forgot.isPending}
          fullWidth
          className="auth-submit-btn"
        >
          Envoyer le lien
        </Button>
      </form>
    </>
  )
}
