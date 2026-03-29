import type { ReactNode } from 'react'
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
  return (
    <div className="form-field">
      <label className="form-field__label" htmlFor={htmlFor}>
        {label}
        {required && <span className="form-field__required">*</span>}
      </label>
      {children}
      {hint && !error && <span className="form-field__hint">{hint}</span>}
      {error && <span className="form-field__error">{error}</span>}
    </div>
  )
}
