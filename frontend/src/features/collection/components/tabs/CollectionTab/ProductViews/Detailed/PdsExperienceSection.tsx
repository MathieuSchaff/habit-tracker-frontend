import { ChevronDown, Star } from 'lucide-react'
import { useState } from 'react'

import { Toggle } from '@/component/Input/Toggle/Toggle'
import { pdsLabels } from '@/features/collection/constants'
import type { UpdateUserProductVariables, UserProduct } from '@/lib/queries/user-products'
import { useUpsertUserProductReview } from '@/lib/queries/user-products'
import { CriteriaList } from './CriteriaList'
import { ExperienceTags } from './ExperienceTags'
import { PdsAccordion } from './PdsAccordion'
import { RepurchasePicker } from './RepurchasePicker'
import { SentimentPicker } from './SentimentPicker'

interface PdsExperienceSectionProps {
  p: UserProduct
  updateMutation: { mutate: (vars: UpdateUserProductVariables) => void }
}

export function PdsExperienceSection({ p, updateMutation }: PdsExperienceSectionProps) {
  const upsertReview = useUpsertUserProductReview()
  const [localComment, setLocalComment] = useState(p.comment || '')

  const handleCommentBlur = () => {
    if (localComment !== (p.comment || '')) {
      updateMutation.mutate({ id: p.id, input: { comment: localComment } })
    }
  }

  return (
    <PdsAccordion
      icon={<Star size={14} />}
      title={pdsLabels.experience}
      defaultOpen
      accent
      badge={
        p.sentiment ? (
          <span role="img" aria-label={`Ressenti ${p.sentiment} sur 6`}>
            {['🤢', '😕', '😐', '🙂', '😍', '💎'][p.sentiment - 1]}
          </span>
        ) : null
      }
    >
      <div className="pds-sub">
        <h4 className="pds-subtitle">{pdsLabels.sentimentQuick}</h4>
        <SentimentPicker
          value={p.sentiment}
          status={p.status}
          onChange={(val) => updateMutation.mutate({ id: p.id, input: { sentiment: val } })}
        />
      </div>

      <div className="pds-sub">
        <h4 className="pds-subtitle">Racheter ?</h4>
        <RepurchasePicker
          value={p.wouldRepurchase}
          onChange={(val) => updateMutation.mutate({ id: p.id, input: { wouldRepurchase: val } })}
        />
      </div>

      <details className="pds-details">
        <summary>
          <span>Évaluer en détail</span>
          <ChevronDown size={12} className="pds-details-chev" aria-hidden="true" />
        </summary>
        <div className="pds-details-body">
          <CriteriaList userProductId={p.id} review={p.review} />
          <div className="pds-review-share">
            <Toggle
              label="Partager publiquement sur la page produit"
              hint="Votre pseudonyme et votre commentaire apparaîtront aux autres utilisateurs. Vous pouvez désactiver à tout moment."
              size="sm"
              checked={p.review?.isPublic ?? false}
              onChange={(checked) =>
                upsertReview.mutate({ id: p.id, input: { isPublic: checked } })
              }
            />
          </div>
        </div>
      </details>

      <div className="pds-sub">
        <h4 className="pds-subtitle">Tags d'usage</h4>
        <ExperienceTags
          ressenti={p.ressenti}
          routine={p.routine}
          preferences={p.preferences}
          onChangeRessenti={(next) =>
            updateMutation.mutate({ id: p.id, input: { ressenti: next } })
          }
          onChangeRoutine={(next) => updateMutation.mutate({ id: p.id, input: { routine: next } })}
          onChangePreferences={(next) =>
            updateMutation.mutate({ id: p.id, input: { preferences: next } })
          }
        />
      </div>

      <div className="pds-sub">
        <h4 className="pds-subtitle">Notes personnelles</h4>
        <textarea
          id="pds-comment"
          className="pds-textarea"
          aria-label="Notes personnelles"
          placeholder="Quelques mots sur votre expérience : texture, odeur, ressenti dans la routine…"
          value={localComment}
          onChange={(e) => setLocalComment(e.target.value)}
          onBlur={handleCommentBlur}
          rows={3}
        />
      </div>
    </PdsAccordion>
  )
}
