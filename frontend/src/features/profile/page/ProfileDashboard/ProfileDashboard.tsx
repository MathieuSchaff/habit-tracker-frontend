import type { ProfileUpdateInput } from '@aurore/shared'

import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { Settings, Shield, Sparkles, Users } from 'lucide-react'
import { Suspense, useState } from 'react'

import { Time } from '@/component/DataDisplay/Time/Time'
import { Spinner } from '@/component/Feedback/ui/Spinner/Spinner'
import { type TabOption, Tabs } from '@/component/Tabs/Tabs'
import { PageTitle } from '@/component/Typography/PageTitle/PageTitle'
import { useAnnounce } from '@/hooks/useAnnounce'
import { profileQueries, useUpdateProfile } from '../../../../lib/queries/profile'
import { SimilarPeople } from '../../../social/components/SimilarPeople/SimilarPeople'
import {
  type CompletionStep,
  CompletionStrip,
} from '../../components/CompletionStrip/CompletionStrip'
import { IdentityCard } from '../../components/IdentityCard/IdentityCard'
import { ProfileAvatar } from '../../components/ProfileAvatar/ProfileAvatar'
import { ShelfPulse } from '../../components/ShelfPulse/ShelfPulse'
import { SkinPortraitCard } from '../../components/SkinPortraitCard/SkinPortraitCard'
import { AccountSettings } from '../../tabs/AccountTab/AccountSettings'
import { PreferenceSettings } from '../../tabs/PreferencesTab/PreferenceSettings'
import './ProfileDashboard.css'

export const PROFILE_TABS = ['profile', 'preferences', 'account', 'people'] as const
export type ProfileTab = (typeof PROFILE_TABS)[number]

const routeApi = getRouteApi('/_authenticated/profile')

export const ProfileDashboard = () => {
  const { data: profile } = useSuspenseQuery(profileQueries.me())
  const { data: dermo } = useQuery(profileQueries.dermo())
  const updateProfile = useUpdateProfile()
  const announce = useAnnounce()
  // Tab lives in the URL so HomeHub doorways can deep-link straight to it (e.g.
  // "Activer la découverte" → account tab where the discoverable toggle sits).
  const { tab: activeTab } = routeApi.useSearch()
  const navigate = routeApi.useNavigate()
  const [editingSection, setEditingSection] = useState<CompletionStep | null>(null)

  const displayName = profile.username ?? 'Utilisateur'

  const handleProfileUpdate = (data: ProfileUpdateInput) => {
    updateProfile.mutate(data, {
      onSuccess: () => {
        setEditingSection(null)
        announce('Profil enregistré')
      },
    })
  }

  const handleEditSection = (section: CompletionStep) => {
    setEditingSection(section)
    requestAnimationFrame(() => {
      document
        .getElementById(`profile-section-${section}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const handleCloseEdit = () => {
    setEditingSection(null)
    updateProfile.reset()
  }

  const errorMessage = updateProfile.isError
    ? 'Une erreur est survenue lors de la mise à jour.'
    : null

  const tabOptions: TabOption<ProfileTab>[] = [
    {
      id: 'profile',
      label: 'Profil',
      icon: <Sparkles size={18} />,
    },
    {
      id: 'preferences',
      label: 'Réglages',
      icon: <Settings size={18} />,
    },
    {
      id: 'account',
      label: 'Compte',
      icon: <Shield size={18} />,
    },
    {
      id: 'people',
      label: 'Des gens comme vous',
      icon: <Users size={18} />,
    },
  ]

  return (
    <main className="profile-dashboard">
      <div className="profile-hero" data-fitz={dermo?.fitzpatrickType ?? 0}>
        <div className="profile-hero__banner" aria-hidden="true">
          <div className="profile-hero__banner-glow" />
        </div>
        <div className="profile-hero__content">
          <div className="profile-hero__avatar-wrapper">
            <ProfileAvatar avatarUrl={profile.avatarUrl} username={profile.username} size="xl" />
          </div>

          <div className="profile-hero__main">
            <div className="profile-hero__header">
              <PageTitle title={displayName} className="profile-hero__info" />
            </div>

            {profile.createdAt && (
              <p className="profile-hero__since">
                <span aria-hidden="true">·</span>
                <span>
                  Membre depuis <Time iso={profile.createdAt} style="monthYear" />
                </span>
              </p>
            )}

            {profile.bio && <p className="profile-hero__bio">{profile.bio}</p>}
          </div>
        </div>
      </div>

      <Tabs
        options={tabOptions}
        activeTab={activeTab}
        onTabChange={(next) => navigate({ search: (prev) => ({ ...prev, tab: next }) })}
        variant="underline"
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
          <CompletionStrip profile={profile} dermo={dermo} onEditSection={handleEditSection} />

          <div className="profile-tab-content__grid">
            <div id="profile-section-hero" className="profile-tab-content__cell">
              <IdentityCard
                profile={profile}
                isEditing={editingSection === 'hero'}
                onEdit={() => setEditingSection('hero')}
                onCloseEdit={handleCloseEdit}
                onSubmit={handleProfileUpdate}
                isPending={updateProfile.isPending}
                errorMessage={errorMessage}
              />
            </div>

            <div id="profile-section-skin" className="profile-tab-content__cell">
              <SkinPortraitCard
                dermo={dermo}
                isEditing={editingSection === 'skin'}
                onEdit={() => setEditingSection('skin')}
                onCloseEdit={() => setEditingSection(null)}
              />
            </div>
          </div>

          <Suspense fallback={<Spinner />}>
            <ShelfPulse />
          </Suspense>
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

        <div
          className="profile-tab-content"
          role="tabpanel"
          id="profile-tab-panel-people"
          aria-labelledby="profile-tab-people"
          hidden={activeTab !== 'people'}
        >
          {/* Lazy-mount: don't fetch the cohort until the tab is opened. */}
          {activeTab === 'people' && <SimilarPeople />}
        </div>
      </div>
    </main>
  )
}
