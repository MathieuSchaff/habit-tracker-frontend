import type { SkinConcern, SkinType, UserDermoProfileUpdateInput } from '@aurore/shared'
import { SKIN_CONCERNS, SKIN_TYPES } from '@aurore/shared'

import { useSuspenseQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { type ReactNode, useId, useState } from 'react'

import { FormMessage } from '@/component/Feedback/ui/FormMessage/FormMessage'
import { ChipGroup } from '@/component/Input/ChipGroup/ChipGroup'
import { FormActions } from '@/component/Input/FormActions/FormActions'
import { Textarea } from '@/component/Input/Textarea/Textarea'
import { Overline } from '@/component/Typography/Overline/Overline'
import { FITZPATRICK_ITEMS, SKIN_CONCERN_LABELS, SKIN_TYPE_LABELS } from '@/constants/skin'
import { profileQueries, useUpdateDermoProfile } from '../../../../lib/queries/profile'
import './DermoProfileForm.css'

type DermoProfileFormProps = {
  onSave?: () => void
  onCancel?: () => void
}

type DermoSectionProps = {
  overline: string
  title: string
  description: string | null
  children: (ids: { titleId: string; descriptionId?: string }) => ReactNode
}

function DermoSection({ overline, title, description, children }: DermoSectionProps) {
  const sectionId = useId()
  const titleId = `${sectionId}-title`
  const descriptionId = description ? `${sectionId}-description` : undefined

  return (
    <section className="dermo-section">
      <Overline className="dermo-section__overline" decorative>
        {overline}
      </Overline>
      <h3 className="dermo-section__title" id={titleId}>
        {title}
      </h3>
      {description && (
        <p className="dermo-section__desc" id={descriptionId}>
          {description}
        </p>
      )}
      {children({ titleId, descriptionId })}
    </section>
  )
}

export function DermoProfileForm({ onSave, onCancel }: DermoProfileFormProps) {
  const { data: dermo } = useSuspenseQuery(profileQueries.dermo())
  const updateMutation = useUpdateDermoProfile()

  const [skinTypes, setSkinTypes] = useState<SkinType[]>((dermo?.skinTypes ?? []) as SkinType[])
  const [fitzpatrickType, setFitzpatrickType] = useState<number | null>(
    dermo?.fitzpatrickType ?? null
  )
  const [skinConcerns, setSkinConcerns] = useState<SkinConcern[]>(
    (dermo?.skinConcerns ?? []) as SkinConcern[]
  )
  const [privateNotes, setPrivateNotes] = useState(dermo?.privateNotes ?? '')
  const [isDirty, setIsDirty] = useState(false)

  const skinTypeOptions = SKIN_TYPES.map((t) => ({ value: t, label: SKIN_TYPE_LABELS[t] }))
  const skinConcernOptions = SKIN_CONCERNS.map((c) => ({ value: c, label: SKIN_CONCERN_LABELS[c] }))

  const handleSave = () => {
    const data: UserDermoProfileUpdateInput = {
      skinTypes,
      fitzpatrickType,
      skinConcerns,
      privateNotes: privateNotes || null,
    }
    updateMutation.mutate(data, {
      onSuccess: () => {
        setIsDirty(false)
        onSave?.()
      },
    })
  }

  return (
    <form
      className="dermo-form"
      onSubmit={(e) => {
        e.preventDefault()
        handleSave()
      }}
    >
      <DermoSection
        overline="Type de peau"
        title="Type de peau"
        description="Sélectionnez jusqu'à 3 types."
      >
        {({ titleId, descriptionId }) => (
          <ChipGroup
            options={skinTypeOptions}
            selected={skinTypes}
            onChange={(v) => {
              setSkinTypes(v as SkinType[])
              setIsDirty(true)
            }}
            max={3}
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
          />
        )}
      </DermoSection>

      <DermoSection
        overline="Phototype"
        title="Phototype de Fitzpatrick"
        description="Réaction de votre peau au soleil."
      >
        {({ titleId, descriptionId }) => (
          <div
            className="dermo-fitzpatrick"
            role="radiogroup"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
          >
            {FITZPATRICK_ITEMS.map(({ value, label, description }) => (
              <label
                key={value}
                className={clsx(
                  'dermo-fitz-item',
                  fitzpatrickType === value && 'dermo-fitz-item--active'
                )}
              >
                <input
                  type="radio"
                  name="fitzpatrick"
                  className="sr-only"
                  checked={fitzpatrickType === value}
                  onChange={() => {
                    setFitzpatrickType(value)
                    setIsDirty(true)
                  }}
                />
                <span className="dermo-fitz-label">{label}</span>
                <span className="dermo-fitz-desc">{description}</span>
              </label>
            ))}
          </div>
        )}
      </DermoSection>

      <DermoSection overline="Conditions" title="Problématiques & conditions" description={null}>
        {({ titleId, descriptionId }) => (
          <ChipGroup
            options={skinConcernOptions}
            selected={skinConcerns}
            onChange={(v) => {
              setSkinConcerns(v as SkinConcern[])
              setIsDirty(true)
            }}
            size="sm"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
          />
        )}
      </DermoSection>

      <DermoSection
        overline="Privé"
        title="Notes privées"
        description="Ces notes sont privées et utilisées uniquement pour les recommandations personnalisées."
      >
        {({ titleId, descriptionId }) => (
          <Textarea
            label=""
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            value={privateNotes}
            onChange={(e) => {
              setPrivateNotes(e.target.value)
              setIsDirty(true)
            }}
            placeholder="Ex : réagis fort aux parfums, sous traitement isotrétinoïne…"
            maxLength={2000}
            hint={`${privateNotes.length}/2000`}
            rows={4}
          />
        )}
      </DermoSection>

      {updateMutation.isError && (
        <FormMessage variant="error">Une erreur est survenue lors de la sauvegarde.</FormMessage>
      )}
      {updateMutation.isSuccess && !isDirty && (
        <FormMessage variant="success">Profil dermato enregistré.</FormMessage>
      )}

      <FormActions onCancel={onCancel} isPending={updateMutation.isPending} disabled={!isDirty} />
    </form>
  )
}
