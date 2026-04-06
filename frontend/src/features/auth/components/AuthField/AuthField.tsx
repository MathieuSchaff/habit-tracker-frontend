import { Eye, EyeOff } from 'lucide-react'
import { type ComponentProps, type ReactNode, useState } from 'react'

import { Button } from '../../../../component/Button/Button'

type AuthFieldProps = Omit<ComponentProps<'input'>, 'id'> & {
  id: string
  label: string
  icon: ReactNode
  error?: string
  passwordToggle?: boolean
}

export const AuthField = ({
  id,
  label,
  icon,
  error,
  passwordToggle,
  type,
  ...inputProps
}: AuthFieldProps) => {
  const [showPassword, setShowPassword] = useState(false)

  const resolvedType = passwordToggle ? (showPassword ? 'text' : 'password') : type

  return (
    <>
      <div className={`auth-field ${error ? 'auth-field--error' : ''}`}>
        <span className="auth-field__icon" aria-hidden="true">
          {icon}
        </span>
        <div className="auth-field__body">
          <label htmlFor={id} className="auth-field__label">
            {label}
          </label>
          <input
            id={id}
            type={resolvedType}
            className="auth-field__input"
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
            {...inputProps}
          />
        </div>
        {passwordToggle && (
          <Button
            variant="ghost"
            size="sm"
            className="auth-field__toggle"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </Button>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="auth-field__error" role="alert">
          {error}
        </p>
      )}
    </>
  )
}
