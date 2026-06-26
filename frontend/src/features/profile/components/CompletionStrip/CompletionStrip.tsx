import type { ProfilePublic, UserDermoProfile } from '@aurore/shared'

import clsx from 'clsx'
import { Check } from 'lucide-react'

import { Button } from '@/component/Button/Button'
import './CompletionStrip.css'

export type CompletionStep = 'hero' | 'skin'

type CompletionStripProps = {
  profile: Pick<ProfilePublic, 'username' | 'bio'>
  dermo: UserDermoProfile | null | undefined
  onEditSection: (section: CompletionStep) => void
}

function isHeroComplete(profile: CompletionStripProps['profile']) {
  return Boolean(profile.username && profile.bio)
}

function isSkinComplete(dermo: UserDermoProfile | null | undefined) {
  if (!dermo) return false
  return (
    (dermo.skinTypes?.length ?? 0) > 0 &&
    dermo.fitzpatrickType !== null &&
    dermo.skinConcerns.length > 0
  )
}

export function CompletionStrip({ profile, dermo, onEditSection }: CompletionStripProps) {
  const heroDone = isHeroComplete(profile)
  const skinDone = isSkinComplete(dermo)
  if (heroDone && skinDone) return null

  const steps: Array<{ id: CompletionStep; label: string; cta: string; done: boolean }> = [
    {
      id: 'hero',
      label: 'Mes informations',
      cta: 'Compléter mes informations',
      done: heroDone,
    },
    {
      id: 'skin',
      label: 'Ma peau',
      cta: 'Compléter ma peau',
      done: skinDone,
    },
  ]

  return (
    <aside className="completion-strip" aria-label="Compléter le profil">
      <div className="completion-strip__intro">
        <span className="completion-strip__overline" aria-hidden="true">
          À votre rythme
        </span>
        <p className="completion-strip__text">
          Quelques touches encore, si vous le souhaitez. Rien n'est urgent.
        </p>
      </div>

      <ol role="list" className="completion-strip__steps" aria-label="Étapes restantes">
        {steps.map((step, index) => (
          <li
            key={step.id}
            className={clsx('completion-step', step.done && 'completion-step--done')}
          >
            <span className="completion-step__dot" aria-hidden="true">
              {step.done ? <Check size={12} strokeWidth={3} /> : <span>{index + 1}</span>}
            </span>
            <span className="completion-step__label">{step.label}</span>
            {!step.done && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onEditSection(step.id)}
                className="completion-step__cta"
              >
                {step.cta}
              </Button>
            )}
          </li>
        ))}
      </ol>
    </aside>
  )
}
