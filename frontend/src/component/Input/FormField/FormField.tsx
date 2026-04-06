import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'
import './FormField.css'

type FormFieldProps = {
  label: string
  htmlFor: string
  required?: boolean
  hint?: string
  error?: string | null
  children: ReactNode
}

export function FormField({ label, htmlFor, required, hint, error, children }: FormFieldProps) {
  const hintId = hint ? `${htmlFor}-hint` : undefined
  const errorId = error ? `${htmlFor}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  // Inject aria-describedby into the first child element
  const enhancedChildren =
    describedBy && isValidElement(children)
      ? cloneElement(
          children as ReactElement<{ 'aria-describedby'?: string; 'aria-invalid'?: boolean }>,
          {
            'aria-describedby': describedBy,
            ...(error ? { 'aria-invalid': true } : {}),
          }
        )
      : children

  return (
    <div className="form-field">
      <label className="form-field__label" htmlFor={htmlFor}>
        {label}
        {required && (
          <span aria-hidden="true" className="form-field__required">
            *
          </span>
        )}
        {required && <span className="sr-only">(requis)</span>}
      </label>
      {enhancedChildren}
      {hint && !error && (
        <span id={hintId} className="form-field__hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className="form-field__error" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
