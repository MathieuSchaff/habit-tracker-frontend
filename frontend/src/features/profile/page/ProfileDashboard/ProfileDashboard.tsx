import type { ProfileUpdateInput } from '@habit-tracker/shared'

import { useSuspenseQuery } from '@tanstack/react-query'
import { Calendar, Droplets, LayoutDashboard, Settings, Shield, UserCircle } from 'lucide-react'
import { Suspense, useState } from 'react'

import { Spinner } from '@/component/Feedback/Spinner/Spinner'
import { PageTitle } from '@/component/Typography/PageTitle/PageTitle'
import { profileQueries, useUpdateProfile } from '../../../../lib/queries/profile'
import { ProfileAvatar } from '../../components/ProfileAvatar/ProfileAvatar'
import { ProfileForm } from '../../components/ProfileForm/ProfileForm'
import { AccountSettings } from '../../tabs/AccountTab/AccountSettings'
import { ProfileStats } from '../../tabs/OverviewTab/ProfileStats'
import { PreferenceSettings } from '../../tabs/PreferencesTab/PreferenceSettings'
import { PrivacySettings } from '../../tabs/PrivacyTab/PrivacySettings'
import { DermoProfileForm } from '../../tabs/SkinTab/DermoProfileForm'
import './ProfileDashboard.css'

import { type TabOption, Tabs } from '@/component/Tabs/Tabs'

const formatJoinDate = (date?: string | null): string => {
  if (!date) return ''
  return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(date))
}

type TabType = 'overview' | 'preferences' | 'account' | 'skin' | 'privacy'

export const ProfileDashboard = () => {
  const { data: profile } = useSuspenseQuery(profileQueries.me())
  const updateProfile = useUpdateProfile()
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  const displayName = profile.username ?? 'Utilisateur'

  const handleUpdate = (data: ProfileUpdateInput) => {
    updateProfile.mutate(data, {
      onSuccess: () => setIsEditing(false),
    })
  }

  const errorMessage = updateProfile.isError
    ? 'Une erreur est survenue lors de la mise à jour.'
    : null

  const tabOptions: TabOption<TabType>[] = [
    {
      id: 'overview',
      label: 'Résumé',
      icon: <LayoutDashboard size={18} />,
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
    {
      id: 'skin',
      label: 'Peau',
      icon: <Droplets size={18} />,
    },
    {
      id: 'privacy',
      label: 'Confidentialité',
      icon: <Shield size={18} />,
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
              <PageTitle
                title={displayName}
                subtitle={profile.username ? `@${profile.username}` : undefined}
                className="profile-hero__info"
              />
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

      {!isEditing && (
        <Tabs
          options={tabOptions}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          className="profile-tabs-container"
          idPrefix="profile-tab"
        />
      )}

      <div className="profile-dashboard__body">
        {isEditing ? (
          <ProfileForm
            profile={profile}
            onSubmit={handleUpdate}
            onCancel={() => {
              setIsEditing(false)
              updateProfile.reset()
            }}
            isPending={updateProfile.isPending}
            error={errorMessage}
          />
        ) : (
          <>
            {activeTab === 'overview' && (
              <div
                className="profile-tab-content"
                role="tabpanel"
                id="profile-tab-panel-overview"
                aria-labelledby="profile-tab-overview"
              >
                <Suspense fallback={<Spinner />}>
                  <ProfileStats />
                </Suspense>
              </div>
            )}
            {activeTab === 'preferences' && (
              <div
                className="profile-tab-content"
                role="tabpanel"
                id="profile-tab-panel-preferences"
                aria-labelledby="profile-tab-preferences"
              >
                <PreferenceSettings />
              </div>
            )}
            {activeTab === 'account' && (
              <div
                className="profile-tab-content"
                role="tabpanel"
                id="profile-tab-panel-account"
                aria-labelledby="profile-tab-account"
              >
                <AccountSettings onEditProfile={() => setIsEditing(true)} />
              </div>
            )}
            {activeTab === 'skin' && (
              <div
                className="profile-tab-content"
                role="tabpanel"
                id="profile-tab-panel-skin"
                aria-labelledby="profile-tab-skin"
              >
                <Suspense fallback={<Spinner />}>
                  <DermoProfileForm />
                </Suspense>
              </div>
            )}
            {activeTab === 'privacy' && (
              <div
                className="profile-tab-content"
                role="tabpanel"
                id="profile-tab-panel-privacy"
                aria-labelledby="profile-tab-privacy"
              >
                <PrivacySettings />
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
