import type { FormEvent } from 'react'

import { FormActions } from '@/component/Input/FormActions/FormActions'
import { Input } from '@/component/Input/Input'

type Props = {
  name: string
  onNameChange: (s: string) => void
  count: number
  onSave?: () => void
  canSave: boolean
}

export function ComparisonHeader({ name, onNameChange, count, onSave, canSave }: Props) {
  // Wrap in form so FormActions' built-in submit button triggers onSave.
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    onSave?.()
  }

  return (
    <header>
      <form onSubmit={handleSubmit}>
        <Input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Nom de la comparaison (facultatif)"
        />
        <p>
          {count} produit{count > 1 ? 's' : ''}
        </p>
        {onSave && <FormActions submitLabel="Enregistrer" disabled={!canSave} />}
      </form>
    </header>
  )
}
