import { useId } from 'react'
import { AlertCircle } from 'lucide-react'
import './Input.css'

type InputProps = React.ComponentProps<'input'> & {
  label?: string
  error?: string
  hint?: string
  hideRequired?: boolean
}

export const Input = ({
  type = 'text',
  label,
  error,
  hint,
  id,
  required,
  disabled,
  hideRequired = false,
  ref,
  ...props
}: InputProps) => {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = error ? `${inputId}-error` : undefined
  const hintId = hint ? `${inputId}-hint` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className="input-wrapper">
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
          {required && !hideRequired && (
            <span aria-hidden="true" className="input-required">
              *
            </span>
          )}
          {required && <span className="sr-only">(requis)</span>}
        </label>
      )}
      {hint && (
        <span id={hintId} className="input-hint">
          {hint}
        </span>
      )}
      <input
        ref={ref}
        id={inputId}
        type={type}
        required={required}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        data-error={!!error || undefined}
        {...props}
      />
      {error && (
        <span id={errorId} className="input-error" role="alert">
          <AlertCircle size={16} />
          {error}
        </span>
      )}
    </div>
  )
}
