import type { ReportTargetType } from '@habit-tracker/shared'

import { Flag } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/component/Button/Button'
import { Modal } from '@/component/Dialog/Modal'
import { FormMessage } from '@/component/Feedback/ui/FormMessage/FormMessage'
import { Textarea } from '@/component/Input/Textarea/Textarea'
import { useCreateReport } from '@/lib/queries/reports'

/* Report flow wording. Exported so tests assert the same string the user sees. */
export const REPORT_LABELS = {
  reasonRequired: 'Une raison courte aide la modération.',
  successMessage:
    'Merci. La modération va le regarder. Aucun signalement n’est partagé publiquement.',
} as const

type ReportContentButtonProps = {
  targetType: ReportTargetType
  targetId: string
  /** Hide the button when the viewer is the author of the content (no point reporting yourself). */
  hidden?: boolean
}

export function ReportContentButton({ targetType, targetId, hidden }: ReportContentButtonProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const createReport = useCreateReport()

  if (hidden) return null

  function close() {
    setOpen(false)
    setReason('')
    setDone(false)
    setError(null)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const trimmed = reason.trim()
    if (trimmed.length < 1) {
      setError(REPORT_LABELS.reasonRequired)
      return
    }
    createReport.mutate(
      { targetType, targetId, reason: trimmed },
      {
        onSuccess: () => setDone(true),
        onError: (err) => setError(err.message),
      }
    )
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="Signaler ce contenu"
      >
        <Flag size={14} aria-hidden="true" />
      </Button>
      {open && (
        <Modal onClose={close} role="dialog" size="sm" className="report-modal">
          <Modal.Title className="report-modal__title">Signaler ce contenu</Modal.Title>
          {done ? (
            <>
              <p className="report-modal__message">{REPORT_LABELS.successMessage}</p>
              <div className="report-modal__actions">
                <Button onClick={close}>Fermer</Button>
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <p className="report-modal__message">
                Décrivez brièvement ce qui pose problème. Votre signalement reste privé.
              </p>
              <Textarea
                label="Raison"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                maxLength={500}
                placeholder="Ex : propos insultants, contenu hors-sujet, etc."
              />
              {error && <FormMessage variant="error">{error}</FormMessage>}
              <div className="report-modal__actions">
                <Button variant="ghost" onClick={close} type="button">
                  Annuler
                </Button>
                <Button type="submit" loading={createReport.isPending}>
                  Envoyer
                </Button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </>
  )
}
