import { cloneElement, isValidElement, type ReactElement, type ReactNode, useId } from 'react'
import './FormField.css'

type FormFieldProps = {
  label: string
  htmlFor?: string
  required?: boolean
  hint?: string
  error?: string | null
  children: ReactNode
}

export function FormField({ label, htmlFor, required, hint, error, children }: FormFieldProps) {
  const fallbackId = useId()
  const baseId = htmlFor ?? fallbackId
  const hintId = hint ? `${baseId}-hint` : undefined
  const errorId = error ? `${baseId}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  // Inject aria-describedby into the first child element.
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

  const labelContent = (
    <>
      {label}
      {required && (
        <span aria-hidden="true" className="form-field__required">
          *
        </span>
      )}
      {required && <span className="sr-only">(requis)</span>}
    </>
  )

  return (
    <div className="form-field">
      {htmlFor ? (
        <label className="form-field__label" htmlFor={htmlFor}>
          {labelContent}
        </label>
      ) : (
        <span className="form-field__label" aria-hidden="true">
          {labelContent}
        </span>
      )}
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
