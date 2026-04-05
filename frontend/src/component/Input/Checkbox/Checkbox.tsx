import clsx from 'clsx'
import { Check } from 'lucide-react'
import { useId } from 'react'

import './Checkbox.css'

type CheckboxProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  size?: 'sm' | 'md'
  disabled?: boolean
  className?: string
}

export function Checkbox({
  checked,
  onChange,
  label,
  size = 'md',
  disabled,
  className,
}: CheckboxProps) {
  const id = useId()

  return (
    <label
      className={clsx('checkbox', `checkbox--${size}`, checked && 'checkbox--checked', className)}
    >
      <input
        id={id}
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        aria-label={label}
      />
      <span className="checkbox__box" aria-hidden="true">
        {checked && <Check size={size === 'sm' ? 12 : 14} />}
      </span>
    </label>
  )
}
