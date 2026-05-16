import type { FormEvent } from 'react'

import { FormActions } from '@/component/Input/FormActions/FormActions'
import { Input } from '@/component/Input/Input'
import './ComparisonHeader.css'

type Props = {
  name: string
  onNameChange: (s: string) => void
  count: number
  onSave?: () => void
  canSave: boolean
}

export function ComparisonHeader({ name, onNameChange, count, onSave, canSave }: Props) {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    onSave?.()
  }

  return (
    <header className="comparison-header">
      <form className="comparison-header__form" onSubmit={handleSubmit}>
        <div className="comparison-header__name-wrap">
          <Input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Nom de la comparaison (facultatif)"
          />
        </div>
        <span className="comparison-header__count">
          {count} produit{count > 1 ? 's' : ''}
        </span>
        {onSave && <FormActions submitLabel="Enregistrer" disabled={!canSave} />}
      </form>
    </header>
  )
}
