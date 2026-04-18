import type { ChangePasswordInput } from '@habit-tracker/shared'

import { Eye, EyeOff } from 'lucide-react'
import { useRef, useState } from 'react'

import { Button } from '@/component/Button/Button'
import { FormMessage } from '../../../../component/Feedback/ui/FormMessage/FormMessage'
import { FormActions } from '../../../../component/Input/FormActions/FormActions'
import { Input } from '../../../../component/Input/Input'
import { useChangePassword } from '../../../../lib/queries/auth'

type ChangePasswordFormProps = {
  onSuccess: () => void
  onCancel: () => void
}

export const ChangePasswordForm = ({ onSuccess, onCancel }: ChangePasswordFormProps) => {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const confirmRef = useRef<HTMLInputElement>(null)

  const changePassword = useChangePassword()

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      confirmRef.current?.focus()
      return
    }

    changePassword.mutate({ currentPassword, newPassword } as ChangePasswordInput, {
      onSuccess: () => {
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        onSuccess()
      },
    })
  }

  const isMatching = newPassword === confirmPassword || confirmPassword === ''
  const canSubmit =
    currentPassword &&
    newPassword &&
    confirmPassword &&
    newPassword === confirmPassword &&
    !changePassword.isPending

  return (
    <form onSubmit={handleSubmit} className="change-password-form">
      <div className="form-header">
        <h4 className="form-title">Changer le mot de passe</h4>
        <Button
          type="button"
          onClick={() => setShowPasswords(!showPasswords)}
          className="show-passwords-btn"
          aria-label={showPasswords ? 'Masquer les mots de passe' : 'Afficher les mots de passe'}
          aria-pressed={showPasswords}
        >
          {showPasswords ? (
            <EyeOff size={16} aria-hidden="true" />
          ) : (
            <Eye size={16} aria-hidden="true" />
          )}
        </Button>
      </div>

      <div className="form-fields">
        <Input
          label="Mot de passe actuel"
          type={showPasswords ? 'text' : 'password'}
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          disabled={changePassword.isPending}
        />

        <Input
          label="Nouveau mot de passe"
          type={showPasswords ? 'text' : 'password'}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          disabled={changePassword.isPending}
          hint="Min. 8 caractères, 1 majuscule, 1 chiffre, 1 spécial"
        />

        <Input
          ref={confirmRef}
          label="Confirmer le nouveau mot de passe"
          type={showPasswords ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          disabled={changePassword.isPending}
          error={!isMatching ? 'Les mots de passe ne correspondent pas' : undefined}
        />
      </div>

      {changePassword.isError && (
        <FormMessage variant="error">
          {changePassword.error.message === 'invalid_credentials'
            ? 'Mot de passe actuel incorrect'
            : changePassword.error.message}
        </FormMessage>
      )}

      {changePassword.isSuccess && (
        <FormMessage variant="success">Mot de passe mis à jour avec succès !</FormMessage>
      )}

      <FormActions
        onCancel={onCancel}
        submitLabel="Confirmer"
        isPending={changePassword.isPending}
        disabled={!canSubmit}
        size="sm"
      />
    </form>
  )
}
