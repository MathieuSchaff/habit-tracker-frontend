import { useQuery } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { Download, ExternalLink, LogOut, ShieldCheck, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '../../../../component/Button/Button'
import { FormMessage } from '../../../../component/Feedback/ui/FormMessage/FormMessage'
import { Toggle } from '../../../../component/Input/Toggle/Toggle'
import { SettingsSection } from '../../../../component/Layout/SettingsSection/SettingsSection'
import { useLogout } from '../../../../lib/queries/auth'
import {
  ExportRateLimitError,
  privacySettingsQueries,
  useDeleteUser,
  useDownloadDataExport,
  useUpdatePrivacySettings,
} from '../../../../lib/queries/profile'
import { useAuthStore } from '../../../../store/auth'
import { ChangePasswordForm } from './ChangePasswordForm'
import { RoleRequestSection } from './RoleRequestSection'
import './AccountSettings.css'

export const AccountSettings = () => {
  const navigate = useNavigate()
  const isDemo = useAuthStore((s) => s.isDemo)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const logout = useLogout()
  const deleteUser = useDeleteUser()
  const downloadExport = useDownloadDataExport()

  const { data: privacy, isLoading: privacyLoading } = useQuery(privacySettingsQueries.get())
  const updatePrivacy = useUpdatePrivacySettings()

  // Deep-link from HomeHub's "Activer la découverte": once the toggles render,
  // scroll to the discoverable one. Once-only so background refetches don't jump.
  const hash = useLocation({ select: (l) => l.hash })
  const scrolledToToggle = useRef(false)
  useEffect(() => {
    if (scrolledToToggle.current || hash !== 'discoverable' || !privacy) return
    scrolledToToggle.current = true
    requestAnimationFrame(() => {
      document
        .getElementById('privacy-discoverable')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }, [hash, privacy])

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => navigate({ to: '/auth/login', search: { redirect: undefined } }),
      onError: () => navigate({ to: '/auth/login', search: { redirect: undefined } }),
    })
  }

  const handlePrivacyToggle = (
    key:
      | 'profilePublic'
      | 'bioPublic'
      | 'avatarPublic'
      | 'linksPublic'
      | 'skinTypesPublic'
      | 'fitzpatrickPublic'
      | 'skinConcernsPublic'
      | 'discoverable'
      | 'aiConsent',
    value: boolean
  ) => {
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
          <p className="privacy-loading">Chargement…</p>
        ) : privacy ? (
          <div className="privacy-toggles">
            <Toggle
              label="Profil public"
              hint="Si activé, votre nom d'utilisateur peut apparaître sur les pages publiques. Choisissez ensuite ce que vous souhaitez partager."
              checked={privacy.profilePublic}
              onChange={(checked) => handlePrivacyToggle('profilePublic', checked)}
              disabled={updatePrivacy.isPending}
            />

            <div className="privacy-subgroup">
              <p className="privacy-subgroup-title">Informations à partager</p>
              <Toggle
                label="Bio"
                checked={privacy.bioPublic}
                onChange={(checked) => handlePrivacyToggle('bioPublic', checked)}
                disabled={!privacy.profilePublic || updatePrivacy.isPending}
              />
              <Toggle
                label="Avatar"
                checked={privacy.avatarPublic}
                onChange={(checked) => handlePrivacyToggle('avatarPublic', checked)}
                disabled={!privacy.profilePublic || updatePrivacy.isPending}
              />
              <Toggle
                label="Liens"
                checked={privacy.linksPublic}
                onChange={(checked) => handlePrivacyToggle('linksPublic', checked)}
                disabled={!privacy.profilePublic || updatePrivacy.isPending}
              />
            </div>

            <div className="privacy-subgroup">
              <p className="privacy-subgroup-title">Profil de peau</p>
              <Toggle
                label="Types de peau"
                checked={privacy.skinTypesPublic}
                onChange={(checked) => handlePrivacyToggle('skinTypesPublic', checked)}
                disabled={!privacy.profilePublic || updatePrivacy.isPending}
              />
              <Toggle
                label="Phototype"
                checked={privacy.fitzpatrickPublic}
                onChange={(checked) => handlePrivacyToggle('fitzpatrickPublic', checked)}
                disabled={!privacy.profilePublic || updatePrivacy.isPending}
              />
              <Toggle
                label="Préoccupations"
                checked={privacy.skinConcernsPublic}
                onChange={(checked) => handlePrivacyToggle('skinConcernsPublic', checked)}
                disabled={!privacy.profilePublic || updatePrivacy.isPending}
              />
            </div>

            <div id="privacy-discoverable" className="privacy-subgroup">
              <p className="privacy-subgroup-title">Rencontres de peau</p>
              <Toggle
                label="Être trouvable par des peaux similaires"
                hint="Aurore peut vous proposer à des personnes dont la peau ressemble à la vôtre. La problématique par laquelle on vous trouve peut être déduite ; vos autres informations restent privées."
                checked={privacy.discoverable}
                onChange={(checked) => handlePrivacyToggle('discoverable', checked)}
                disabled={!privacy.profilePublic || updatePrivacy.isPending}
              />
            </div>

            <div className="privacy-ai-section">
              <p className="privacy-section-desc">
                Autoriser Aurore à analyser des produits en fonction de votre profil avec Mistral AI
                — hébergé en France, vos données ne quittent pas l'Europe.{' '}
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

      <RoleRequestSection />

      <SettingsSection
        title="Mes données"
        description="Téléchargez une copie complète de vos données au format JSON (droit à la portabilité, RGPD article 20)."
      >
        <div className="account-actions">
          <Button
            type="button"
            variant="outline"
            className="account-action-btn"
            onClick={() => downloadExport.mutate()}
            disabled={downloadExport.isPending}
          >
            <Download size={18} />
            {downloadExport.isPending ? 'Préparation…' : 'Télécharger mes données'}
          </Button>
          {downloadExport.isError && (
            <FormMessage variant="error">
              {downloadExport.error instanceof ExportRateLimitError
                ? `Trop de demandes. Réessayez dans environ ${Math.ceil(
                    downloadExport.error.retryAfterSec / 60
                  )} min.`
                : 'Le téléchargement a échoué. Veuillez réessayer.'}
            </FormMessage>
          )}
        </div>
      </SettingsSection>

      <SettingsSection title="Session" description="Déconnectez-vous de cet appareil.">
        <div className="account-actions">
          <Button
            type="button"
            variant="outline"
            className="account-action-btn"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            Se déconnecter
          </Button>
        </div>
      </SettingsSection>

      {isDemo ? (
        <SettingsSection
          title="Compte temporaire"
          description="Vous explorez Aurore en mode démo. Vos données disparaîtront à la déconnexion — rien à supprimer."
        />
      ) : (
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
              <output className="delete-confirm">
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
                        onSuccess: () =>
                          navigate({ to: '/auth/login', search: { redirect: undefined } }),
                      })
                    }
                    disabled={deleteUser.isPending}
                  >
                    <Trash2 size={18} />
                    {deleteUser.isPending ? 'Suppression…' : 'Confirmer la suppression'}
                  </Button>
                </div>
              </output>
            )}
          </div>
        </SettingsSection>
      )}
    </div>
  )
}
