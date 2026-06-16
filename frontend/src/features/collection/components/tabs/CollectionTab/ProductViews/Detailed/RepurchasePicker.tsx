import clsx from 'clsx'

import type { UserProduct } from '@/lib/queries/user-products'

import './RepurchasePicker.css'

type RepurchaseValue = NonNullable<UserProduct['wouldRepurchase']>

const options: { value: RepurchaseValue; label: string }[] = [
  { value: 'yes', label: 'Oui' },
  { value: 'unsure', label: 'Peut-être' },
  { value: 'no', label: 'Non' },
]

interface RepurchasePickerProps {
  value: UserProduct['wouldRepurchase']
  onChange: (value: RepurchaseValue) => void
}

export function RepurchasePicker({ value, onChange }: RepurchasePickerProps) {
  return (
    <div className="pds-repurchase-section">
      <fieldset className="pds-repurchase-btns" aria-label="Racheter ?">
        {options.map(({ value: val, label }) => (
          <button
            key={val}
            type="button"
            className={clsx('pds-repurchase-btn', val, value === val && 'active')}
            aria-pressed={value === val}
            onClick={() => onChange(val)}
          >
            {label}
          </button>
        ))}
      </fieldset>
    </div>
  )
}
