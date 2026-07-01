import { Heart } from 'lucide-react'

import { Button } from '@/component/Button/Button'
import { pdsLabels, statusLabels } from '@/features/collection/constants'
import type { UserProduct } from '@/lib/queries/user-products'
import { PdsAccordion } from './PdsAccordion'
import { StatusHistory } from './StatusHistory'
import type { StatusDecision } from './useStatusDecision'

import './PdsDecisionSection.css'

interface PdsDecisionSectionProps {
  p: UserProduct
  decision: StatusDecision
  isUpdatePending: boolean
}

export function PdsDecisionSection({ p, decision, isUpdatePending }: PdsDecisionSectionProps) {
  const {
    decisionSectionRef,
    pendingStatus,
    reasonDraft,
    setReasonDraft,
    handleConfirmStatus,
    handleCancelStatus,
  } = decision

  return (
    <PdsAccordion
      icon={<Heart size={14} />}
      title={pdsLabels.decision}
      forceOpen={pendingStatus !== null}
    >
      <section
        ref={decisionSectionRef}
        id="pds-decision"
        tabIndex={-1}
        className="pds-decision-body"
      >
        {pendingStatus && (
          <div className="pds-reason-prompt">
            <p className="pds-reason-lead">
              Marquer comme <strong>{statusLabels[pendingStatus].label}</strong> — une raison à
              garder en tête ?
            </p>
            <p className="pds-reason-hint">Optionnel. Ajoutée à votre historique.</p>
            <textarea
              id="pds-reason"
              className="pds-reason-textarea"
              aria-label="Raison (optionnelle)"
              value={reasonDraft}
              onChange={(e) => setReasonDraft(e.target.value)}
              placeholder="Trop riche pour mon hiver, picotements à la première utilisation…"
              rows={2}
            />
            <div className="pds-reason-actions">
              <Button variant="ghost" size="sm" onClick={handleCancelStatus}>
                Annuler
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={isUpdatePending}
                onClick={handleConfirmStatus}
              >
                Confirmer
              </Button>
            </div>
          </div>
        )}
        <StatusHistory userProductId={p.id} />
      </section>
    </PdsAccordion>
  )
}
