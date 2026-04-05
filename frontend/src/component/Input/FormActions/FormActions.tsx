import { Check, X } from 'lucide-react'

import { Button } from '../../Button/Button'
import './FormActions.css'

type FormActionsProps = {
  onCancel?: () => void
  cancelLabel?: string
  submitLabel?: string
  isPending?: boolean
  disabled?: boolean
  size?: 'sm' | 'md'
}

export function FormActions({
  onCancel,
  cancelLabel = 'Annuler',
  submitLabel = 'Enregistrer',
  isPending,
  disabled,
  size = 'md',
}: FormActionsProps) {
  return (
    <div className="form-actions-bar">
      {onCancel && (
        <Button type="button" variant="outline" size={size} onClick={onCancel} disabled={isPending}>
          <X size={size === 'sm' ? 14 : 16} />
          {cancelLabel}
        </Button>
      )}
      <Button type="submit" variant="primary" size={size} loading={isPending} disabled={disabled}>
        <Check size={size === 'sm' ? 14 : 16} />
        {submitLabel}
      </Button>
    </div>
  )
}
