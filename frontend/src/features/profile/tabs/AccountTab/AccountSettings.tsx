import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ExternalLink, LogOut, ShieldCheck, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '../../../../component/Button/Button'
import { FormMessage } from '../../../../component/Feedback/ui/FormMessage/FormMessage'
import { Toggle } from '../../../../component/Input/Toggle/Toggle'
import { SettingsSection } from '../../../../component/Layout/SettingsSection/SettingsSection'
import { useLogout } from '../../../../lib/queries/auth'
import {
  privacySettingsQueries,
  useDeleteUser,
  useUpdatePrivacySettings,
} from '../../../../lib/queries/profile'
import { ChangePasswordForm } from './ChangePasswordForm'
import './AccountSettings.css'

export const AccountSettings = () => {
  const navigate = useNavigate()
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const logout = useLogout()
  const deleteUser = useDeleteUser()

  const { data: privacy, isLoading: privacyLoading } = useQuery(privacySettingsQueries.get())
  const updatePrivacy = useUpdatePrivacySettings()

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => navigate({ to: '/auth/login' }),
      onError: () => navigate({ to: '/auth/login' }),
    })
  }

  const handlePrivacyToggle = (key: 'profilePublic' | 'aiConsent', value: boolean) => {
    updatePrivacy.mutate({ [key]: value })
  }

  return (
    <div className="account-settings">
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

      <SettingsSection
        title="Confidentialité"
        description="Contrôlez ce que les autres peuvent voir de vous."
      >
        {privacyLoading ? (
          <p className="privacy-loading">Chargement...</p>
        ) : privacy ? (
          <div className="privacy-toggles">
            <Toggle
              label="Profil public"
              hint="Votre nom et avatar visibles par les autres utilisateurs."
              checked={privacy.profilePublic}
              onChange={(checked) => handlePrivacyToggle('profilePublic', checked)}
              disabled={updatePrivacy.isPending}
            />

            <div className="privacy-ai-section">
              <p className="privacy-section-desc">
                Autoriser Aurore à analyser votre routine avec Mistral AI — hébergé en France, vos
                données ne quittent pas l'Europe.{' '}
                <span className="privacy-badge">Fonctionnalité à venir</span>
              </p>
              <Toggle
                label="Activer l'analyse IA"
                hint="Peut être révoqué à tout moment. Aucune donnée envoyée sans ce consentement."
                checked={privacy.aiConsent}
                onChange={(checked) => handlePrivacyToggle('aiConsent', checked)}
                disabled={updatePrivacy.isPending}
              />
            </div>

            <Link to="/privacy" className="privacy-policy-link">
              Lire la politique de confidentialité complète
              <ExternalLink size={14} aria-hidden="true" />
            </Link>

            {updatePrivacy.isError && (
              <FormMessage variant="error">
                La mise à jour a échoué. Veuillez réessayer.
              </FormMessage>
            )}
          </div>
        ) : null}
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
