import { useNavigate } from '@tanstack/react-router'
import { LogOut, Pencil, ShieldCheck, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '../../../../component/Button/Button'
import { SettingsSection } from '../../../../component/Layout/SettingsSection/SettingsSection'
import { useLogout } from '../../../../lib/queries/auth'
import { useDeleteUser } from '../../../../lib/queries/profile'
import { ChangePasswordForm } from './ChangePasswordForm'
import './AccountSettings.css'

interface AccountSettingsProps {
  onEditProfile: () => void
}

export const AccountSettings = ({ onEditProfile }: AccountSettingsProps) => {
  const navigate = useNavigate()
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const logout = useLogout()
  const deleteUser = useDeleteUser()

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => navigate({ to: '/auth/login' }),
      onError: () => navigate({ to: '/auth/login' }),
    })
  }

  return (
    <div className="account-settings">
      <SettingsSection
        title="Profil"
        description="Modifiez vos informations publiques, votre bio et votre avatar."
      >
        <div className="account-actions">
          <Button
            type="button"
            variant="outline"
            className="account-action-btn"
            onClick={onEditProfile}
          >
            <Pencil size={18} />
            Modifier mes informations
          </Button>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Sécurité"
        description="Gérez l'accès à votre compte et vos données personnelles."
      >
        <div className="account-actions">
          {!showPasswordForm ? (
            <Button
              type="button"
              variant="outline"
              className="account-action-btn"
              onClick={() => setShowPasswordForm(true)}
            >
              <ShieldCheck size={18} />
              Changer le mot de passe
            </Button>
          ) : (
            <ChangePasswordForm
              onSuccess={() => {
                setTimeout(() => setShowPasswordForm(false), 2000)
              }}
              onCancel={() => setShowPasswordForm(false)}
            />
          )}
        </div>
      </SettingsSection>

      <SettingsSection title="Session" description="Déconnectez-vous de cet appareil.">
        <div className="account-actions">
          <Button
            type="button"
            variant="outline"
            className="account-action-btn logout-btn"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            Se déconnecter
          </Button>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Zone de danger"
        description="Actions irréversibles sur votre compte."
        variant="danger"
      >
        <div className="account-actions">
          {!confirmDelete ? (
            <Button
              type="button"
              variant="outline"
              className="account-action-btn delete-btn"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 size={18} />
              Supprimer mon compte
            </Button>
          ) : (
            <div className="delete-confirm" role="alert">
              <p className="delete-confirm-text">
                Cette action est irréversible. Toutes vos données seront supprimées.
              </p>
              <div className="delete-confirm-actions">
                <Button
                  type="button"
                  variant="outline"
                  className="account-action-btn"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleteUser.isPending}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="account-action-btn delete-btn"
                  onClick={() =>
                    deleteUser.mutate(undefined, {
                      onSuccess: () => navigate({ to: '/auth/login' }),
                    })
                  }
                  disabled={deleteUser.isPending}
                >
                  <Trash2 size={18} />
                  {deleteUser.isPending ? 'Suppression…' : 'Confirmer la suppression'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </SettingsSection>
    </div>
  )
}
