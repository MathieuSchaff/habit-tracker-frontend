import { AlertCircle } from 'lucide-react'
import { useId } from 'react'
import './Textarea.css'

type TextareaProps = React.ComponentProps<'textarea'> & {
  label?: string
  error?: string
  hint?: string
  hideRequired?: boolean
}

export const Textarea = ({
  label,
  error,
  hint,
  id,
  required,
  disabled,
  hideRequired = false,
  ref,
  ...props
}: TextareaProps) => {
  const generatedId = useId()
  const textareaId = id ?? generatedId
  const errorId = error ? `${textareaId}-error` : undefined
  const hintId = hint ? `${textareaId}-hint` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className="textarea-wrapper">
      {label && (
        <label htmlFor={textareaId} className="textarea-label">
          {label}
          {required && !hideRequired && (
            <span aria-hidden="true" className="textarea-required">
              *
            </span>
          )}
          {required && <span className="sr-only">(requis)</span>}
        </label>
      )}
      {hint && (
        <span id={hintId} className="textarea-hint">
          {hint}
        </span>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        required={required}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        data-error={!!error || undefined}
        {...props}
      />
      {error && (
        <span id={errorId} className="textarea-error" role="alert">
          <AlertCircle size={16} />
          {error}
        </span>
      )}
    </div>
  )
}
