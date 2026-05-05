import { AlertCircle, ChevronDown } from 'lucide-react'
import { useId } from 'react'
import './Select.css'

export type SelectOption<V extends string = string> = {
  value: V
  label: string
  disabled?: boolean
}

type SelectProps<V extends string = string> = Omit<
  React.ComponentProps<'select'>,
  'children' | 'value' | 'onChange'
> & {
  label?: string
  error?: string
  hint?: string
  hideRequired?: boolean
  options: ReadonlyArray<SelectOption<V>>
  value: V | ''
  onValueChange: (value: V | '') => void
  placeholder?: string
}

export function Select<V extends string = string>({
  label,
  error,
  hint,
  id,
  required,
  disabled,
  hideRequired = false,
  options,
  value,
  onValueChange,
  placeholder,
  className,
  ref,
  ...props
}: SelectProps<V>) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const errorId = error ? `${selectId}-error` : undefined
  const hintId = hint ? `${selectId}-hint` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={`select-wrapper${className ? ` ${className}` : ''}`}>
      {label && (
        <label htmlFor={selectId} className="select-label">
          {label}
          {required && !hideRequired && (
            <span aria-hidden="true" className="select-required">
              *
            </span>
          )}
          {required && <span className="sr-only">(requis)</span>}
        </label>
      )}
      {hint && (
        <span id={hintId} className="select-hint">
          {hint}
        </span>
      )}
      <div className="select-control">
        <select
          ref={ref}
          id={selectId}
          required={required}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          data-error={!!error || undefined}
          value={value}
          onChange={(e) => onValueChange(e.target.value as V | '')}
          {...props}
        >
          {placeholder !== undefined && (
            <option value="" disabled={required}>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="select-chevron" size={16} aria-hidden="true" />
      </div>
      {error && (
        <span id={errorId} className="select-error" role="alert">
          <AlertCircle size={16} />
          {error}
        </span>
      )}
    </div>
  )
}
