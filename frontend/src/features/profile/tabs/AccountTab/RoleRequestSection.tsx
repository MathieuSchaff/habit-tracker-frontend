import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { Button } from '../../../../component/Button/Button'
import { FormMessage } from '../../../../component/Feedback/ui/FormMessage/FormMessage'
import { FormActions } from '../../../../component/Input/FormActions/FormActions'
import { Input } from '../../../../component/Input/Input'
import { Textarea } from '../../../../component/Input/Textarea/Textarea'
import { SettingsSection } from '../../../../component/Layout/SettingsSection/SettingsSection'
import {
  roleRequestQueries,
  useCancelRoleRequest,
  useSubmitRoleRequest,
} from '../../../../lib/queries/role-requests'
import { useAuthStore } from '../../../../store/auth'

// Server error codes from submitRoleRequestBodySchema's mapping → calm FR copy.
const ROLE_REQUEST_ERRORS: Record<string, string> = {
  already_pending: 'Vous avez déjà une demande en attente.',
  already_elevated: 'Vous êtes déjà modérateur ou administrateur.',
}

const MOTIVATION_MIN = 10
const MOTIVATION_MAX = 1000

export const RoleRequestSection = () => {
  // Section is for plain users only; it unmounts once the role flips to contributor.
  const isUser = useAuthStore((s) => s.role === 'user')
  const {
    data: latest,
    isLoading,
    isError,
  } = useQuery({
    ...roleRequestQueries.mine(),
    enabled: isUser,
  })
  const submit = useSubmitRoleRequest()
  const cancel = useCancelRoleRequest()
  const [motivation, setMotivation] = useState('')
  const [link, setLink] = useState('')

  if (!isUser) return null

  const trimmedMotivation = motivation.trim()
  const trimmedLink = link.trim()
  const linkValid = trimmedLink === '' || /^https:\/\//i.test(trimmedLink)
  const canSubmit =
    trimmedMotivation.length >= MOTIVATION_MIN &&
    trimmedMotivation.length <= MOTIVATION_MAX &&
    linkValid &&
    !submit.isPending

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    submit.mutate(
      {
        motivation: trimmedMotivation,
        // Omit the link when empty — never send '' or null (httpsUrl is optional, absent = not provided).
        ...(trimmedLink ? { motivationLink: trimmedLink } : {}),
      },
      {
        onSuccess: () => {
          setMotivation('')
          setLink('')
        },
      }
    )
  }

  const form = (
    <form onSubmit={handleSubmit} className="role-request-form">
      <div className="form-fields">
        <Textarea
          label="Votre motivation"
          value={motivation}
          onChange={(e) => setMotivation(e.target.value)}
          rows={4}
          required
          maxLength={MOTIVATION_MAX}
          hint={`Entre ${MOTIVATION_MIN} et ${MOTIVATION_MAX} caractères. Dites-nous pourquoi vous souhaitez aider à vérifier et enrichir le catalogue.`}
          disabled={submit.isPending}
        />
        <Input
          label="Lien (optionnel)"
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://…"
          hint="Profil, portfolio ou tout lien utile. https uniquement."
          error={!linkValid ? 'Le lien doit commencer par https://' : undefined}
          disabled={submit.isPending}
        />
      </div>

      {submit.isError && (
        <FormMessage variant="error">
          {ROLE_REQUEST_ERRORS[submit.error.message] ?? 'L’envoi a échoué. Veuillez réessayer.'}
        </FormMessage>
      )}

      <FormActions
        submitLabel="Envoyer la demande"
        isPending={submit.isPending}
        disabled={!canSubmit}
        size="sm"
      />
    </form>
  )

  let body: React.ReactNode
  if (isLoading) {
    body = <p className="role-request-intro">Chargement…</p>
  } else if (isError) {
    // Don't fall through to the form on a failed load — a user with a pending request
    // would see it and re-submit into an `already_pending` error.
    body = (
      <FormMessage variant="warning">
        Impossible de charger l'état de votre demande. Rechargez la page.
      </FormMessage>
    )
  } else if (latest?.status === 'pending') {
    body = (
      <div className="role-request-status">
        <p className="role-request-status-text">
          Votre demande est <strong>en attente</strong> de validation. Vous deviendrez modérateur
          dès qu'un administrateur l'aura approuvée.
        </p>
        {cancel.isError && (
          <FormMessage variant="error">L’annulation a échoué. Veuillez réessayer.</FormMessage>
        )}
        <Button
          variant="outline"
          size="sm"
          loading={cancel.isPending}
          onClick={() => cancel.mutate(latest.id)}
        >
          Annuler ma demande
        </Button>
      </div>
    )
  } else if (latest?.status === 'approved') {
    // Welcome message. The role flips to contributor at the next token refresh (≤15 min),
    // which unmounts this section — no force-refresh needed.
    body = (
      <FormMessage variant="success">
        Votre demande a été acceptée. Vos accès modérateur seront actifs d'ici quelques minutes, à
        la prochaine actualisation de votre session.
      </FormMessage>
    )
  } else {
    // null (first time), cancelled, or rejected → the form, with the rejection reason shown above it.
    body = (
      <div className="role-request-section">
        {latest?.status === 'rejected' && (
          <FormMessage variant="warning">
            Votre demande a été refusée
            {latest.rejectionReason ? ` : ${latest.rejectionReason}` : '.'} Vous pouvez en soumettre
            une nouvelle.
          </FormMessage>
        )}
        <p className="role-request-intro">
          Devenir modérateur, c'est aider à vérifier et enrichir le catalogue : valider des fiches,
          lier les ingrédients, compléter les tags.
        </p>
        {form}
      </div>
    )
  }

  return (
    <SettingsSection
      title="Devenir modérateur"
      description="Contribuez à la qualité du catalogue partagé."
    >
      {body}
    </SettingsSection>
  )
}
