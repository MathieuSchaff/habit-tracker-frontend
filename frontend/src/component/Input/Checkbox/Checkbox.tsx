import clsx from 'clsx'
import { Check } from 'lucide-react'

import './Checkbox.css'

type CheckboxProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  size?: 'sm' | 'md'
  disabled?: boolean
  className?: string
}

export function Checkbox({ checked, onChange, size = 'md', disabled, className }: CheckboxProps) {
  return (
    <button
      type="button"
      className={clsx('checkbox', `checkbox--${size}`, checked && 'checkbox--checked', className)}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      aria-pressed={checked}
    >
      {checked && <Check size={size === 'sm' ? 12 : 14} />}
    </button>
  )
}
