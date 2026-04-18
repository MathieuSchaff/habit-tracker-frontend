import type { ProfileUpdateInput } from '@habit-tracker/shared'

import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Calendar, Settings, UserCircle } from 'lucide-react'
import { Suspense, useCallback, useState } from 'react'

import { Spinner } from '@/component/Feedback/ui/Spinner/Spinner'
import { type TabOption, Tabs } from '@/component/Tabs/Tabs'
import { PageTitle } from '@/component/Typography/PageTitle/PageTitle'
import { profileQueries, useUpdateProfile } from '../../../../lib/queries/profile'
import { EditableSection } from '../../components/EditableSection/EditableSection'
import { ProfileAvatar } from '../../components/ProfileAvatar/ProfileAvatar'
import { ProfileForm } from '../../components/ProfileForm/ProfileForm'
import { SkinProfileRead } from '../../components/SkinProfileRead/SkinProfileRead'
import { AccountSettings } from '../../tabs/AccountTab/AccountSettings'
import { ProfileStats } from '../../tabs/OverviewTab/ProfileStats'
import { PreferenceSettings } from '../../tabs/PreferencesTab/PreferenceSettings'
import { DermoProfileForm } from '../../tabs/SkinTab/DermoProfileForm'
import './ProfileDashboard.css'

const formatJoinDate = (date?: string | null): string => {
  if (!date) return ''
  return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(date))
}

type TabType = 'profile' | 'preferences' | 'account'
type EditingSection = 'hero' | 'skin' | null

export const ProfileDashboard = () => {
  const { data: profile } = useSuspenseQuery(profileQueries.me())
  const { data: dermo } = useQuery(profileQueries.dermo())
  const updateProfile = useUpdateProfile()
  const [activeTab, setActiveTab] = useState<TabType>('profile')
  const [editingSection, setEditingSection] = useState<EditingSection>(null)

  const displayName = profile.username ?? 'Utilisateur'

  const handleEditSection = useCallback((section: EditingSection) => {
    setEditingSection(section)
  }, [])

  const handleProfileUpdate = (data: ProfileUpdateInput) => {
    updateProfile.mutate(data, {
      onSuccess: () => setEditingSection(null),
    })
  }

  const errorMessage = updateProfile.isError
    ? 'Une erreur est survenue lors de la mise à jour.'
    : null

  const tabOptions: TabOption<TabType>[] = [
    {
      id: 'profile',
      label: 'Profil',
      icon: <UserCircle size={18} />,
    },
    {
      id: 'preferences',
      label: 'Réglages',
      icon: <Settings size={18} />,
    },
    {
      id: 'account',
      label: 'Compte',
      icon: <UserCircle size={18} />,
    },
  ]

  return (
    <main className="profile-dashboard">
      <div className="profile-hero">
        <div className="profile-hero__banner" />
        <div className="profile-hero__content">
          <div className="profile-hero__avatar-wrapper">
            <ProfileAvatar avatarUrl={profile.avatarUrl} username={profile.username} size="xl" />
          </div>

          <div className="profile-hero__main">
            <div className="profile-hero__header">
              <PageTitle title={displayName} className="profile-hero__info" />
            </div>

            {profile.bio && <p className="profile-hero__bio">{profile.bio}</p>}

            {profile.createdAt && (
              <p className="profile-hero__since">
                <Calendar size={13} aria-hidden="true" />
                <span>Membre depuis {formatJoinDate(profile.createdAt)}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      <Tabs
        options={tabOptions}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        className="profile-tabs-container"
        idPrefix="profile-tab"
      />

      <div className="profile-dashboard__body">
        <div
          className="profile-tab-content"
          role="tabpanel"
          id="profile-tab-panel-profile"
          aria-labelledby="profile-tab-profile"
          hidden={activeTab !== 'profile'}
        >
          <EditableSection
            title="Mes informations"
            isEditing={editingSection === 'hero'}
            onEdit={() => handleEditSection('hero')}
            readContent={
              <div className="profile-info-read">
                {profile.bio && <p className="profile-info-read__bio">{profile.bio}</p>}
                {profile.links && profile.links.length > 0 && (
                  <div className="profile-info-read__links">
                    {profile.links.map((link) => (
                      <a
                        key={link.url}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="profile-info-read__link"
                      >
                        {link.label || link.url}
                      </a>
                    ))}
                  </div>
                )}
                {!profile.bio && (!profile.links || profile.links.length === 0) && (
                  <p className="profile-info-read__empty">Aucune information renseignée.</p>
                )}
              </div>
            }
            editContent={
              <ProfileForm
                profile={profile}
                onSubmit={handleProfileUpdate}
                onCancel={() => {
                  setEditingSection(null)
                  updateProfile.reset()
                }}
                isPending={updateProfile.isPending}
                error={errorMessage}
              />
            }
          />

          <Suspense fallback={<Spinner />}>
            <ProfileStats />
          </Suspense>

          <EditableSection
            title="Ma peau"
            isEditing={editingSection === 'skin'}
            onEdit={() => handleEditSection('skin')}
            readContent={
              dermo ? (
                <SkinProfileRead dermo={dermo} />
              ) : (
                <p className="skin-read__empty">Chargement...</p>
              )
            }
            editContent={
              <Suspense fallback={<Spinner />}>
                <DermoProfileForm onSave={() => setEditingSection(null)} />
              </Suspense>
            }
          />
        </div>

        <div
          className="profile-tab-content"
          role="tabpanel"
          id="profile-tab-panel-preferences"
          aria-labelledby="profile-tab-preferences"
          hidden={activeTab !== 'preferences'}
        >
          <PreferenceSettings />
        </div>

        <div
          className="profile-tab-content"
          role="tabpanel"
          id="profile-tab-panel-account"
          aria-labelledby="profile-tab-account"
          hidden={activeTab !== 'account'}
        >
          <AccountSettings />
        </div>
      </div>
    </main>
  )
}
