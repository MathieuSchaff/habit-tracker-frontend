import clsx from 'clsx'
import { useId } from 'react'
import './Toggle.css'

type ToggleProps = Omit<React.ComponentProps<'input'>, 'type' | 'onChange'> & {
  label: string
  hint?: string
  onChange?: (checked: boolean) => void
  size?: 'sm' | 'md'
  layout?: 'row' | 'column'
}

export function Toggle({
  label,
  hint,
  onChange,
  size = 'md',
  layout = 'row',
  id,
  ref,
  ...props
}: ToggleProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <label
      className={clsx('toggle', `toggle--${size}`, `toggle--${layout}`)}
      htmlFor={inputId}
    >
      <div className="toggle__info">
        <span className="toggle__label">{label}</span>
        {hint && <span className="toggle__hint">{hint}</span>}
      </div>
      <input
        {...props}
        ref={ref}
        id={inputId}
        type="checkbox"
        className="sr-only"
        onChange={(e) => { if (!e.target.disabled) onChange?.(e.target.checked) }}
      />
      <span className="toggle__switch" aria-hidden="true" />
    </label>
  )
}
