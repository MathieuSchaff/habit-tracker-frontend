import { ClipboardCopy } from 'lucide-react'
import { useCallback } from 'react'

import { FormField } from '@/component/Input/FormField/FormField'
import { Input } from '@/component/Input/Input'
import { Textarea } from '@/component/Input/Textarea/Textarea'
import type {
  IngredientFormData,
  IngredientFormFieldKey,
} from '@/features/ingredients/hooks/useIngredientFormSubmit'

type DraftProps = {
  fieldKey: IngredientFormFieldKey
  conflict: { draft: IngredientFormData } | null
  onRestoreField: (key: IngredientFormFieldKey) => void
}

function pickDraft(
  value: string,
  conflict: { draft: IngredientFormData } | null,
  fieldKey: IngredientFormFieldKey
): string | undefined {
  const draft = conflict?.draft[fieldKey]
  if (draft === undefined || draft === value) return undefined
  return draft
}

type ChangeHandler = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void

export function IngredientInputField({
  label,
  id,
  value,
  onChange,
  placeholder,
  hint,
  required,
  autoFocus,
  fieldError,
  fieldKey,
  conflict,
  onRestoreField,
}: {
  label: string
  id: string
  value: string
  onChange: ChangeHandler
  placeholder?: string
  hint?: string
  required?: boolean
  autoFocus?: boolean
  fieldError?: string
} & DraftProps) {
  return (
    <FormField label={label} htmlFor={id} required={required} hint={hint}>
      <Input
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        error={fieldError}
      />
      <DraftHint
        fieldKey={fieldKey}
        label={label}
        value={pickDraft(value, conflict, fieldKey)}
        onRestoreField={onRestoreField}
      />
    </FormField>
  )
}

export function IngredientTextareaField({
  label,
  id,
  value,
  onChange,
  placeholder,
  rows,
  hint,
  fieldKey,
  conflict,
  onRestoreField,
}: {
  label: string
  id: string
  value: string
  onChange: ChangeHandler
  placeholder?: string
  rows?: number
  hint?: string
} & DraftProps) {
  return (
    <>
      <Textarea
        label={label}
        id={id}
        hint={hint}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
      />
      <DraftHint
        fieldKey={fieldKey}
        label={label}
        value={pickDraft(value, conflict, fieldKey)}
        onRestoreField={onRestoreField}
      />
    </>
  )
}

function DraftHint({
  fieldKey,
  label,
  value,
  onRestoreField,
}: {
  fieldKey: IngredientFormFieldKey
  label: string
  value: string | undefined
  onRestoreField: (key: IngredientFormFieldKey) => void
}) {
  const handleClick = useCallback(() => onRestoreField(fieldKey), [fieldKey, onRestoreField])
  if (value === undefined) return null
  return (
    <div className="draft-hint">
      <div className="draft-hint__header">
        <span className="draft-hint__label">Ton brouillon ({label})</span>
        <button type="button" className="draft-hint__restore" onClick={handleClick}>
          <ClipboardCopy size={12} />
          Restaurer
        </button>
      </div>
      <pre className="draft-hint__value">{value || '(vide)'}</pre>
    </div>
  )
}
