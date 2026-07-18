import type { ProfileUpdateInput } from '@aurore/shared'

import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { Settings, Shield, Sparkles, Users } from 'lucide-react'
import { Suspense, useState } from 'react'

import { Spinner } from '@/component/Feedback/ui/Spinner/Spinner'
import { type TabOption, TabPanel, Tabs } from '@/component/Tabs/Tabs'
import { useAnnounce } from '@/hooks/useAnnounce'
import { profileQueries, useUpdateProfile } from '../../../../lib/queries/profile'
import { SimilarPeople } from '../../../social/components/SimilarPeople/SimilarPeople'
import {
  type CompletionStep,
  CompletionStrip,
} from '../../components/CompletionStrip/CompletionStrip'
import { IdentityCard } from '../../components/IdentityCard/IdentityCard'
import { ProfileHero } from '../../components/ProfileHero/ProfileHero'
import { ShelfPulse } from '../../components/ShelfPulse/ShelfPulse'
import { SkinPortraitCard } from '../../components/SkinPortraitCard/SkinPortraitCard'
import { AccountSettings } from '../../tabs/AccountTab/AccountSettings'
import { PreferenceSettings } from '../../tabs/PreferencesTab/PreferenceSettings'
import './ProfileDashboard.css'
import type { ProfileTab } from './tabs'

const routeApi = getRouteApi('/_authenticated/profile')

export const ProfileDashboard = () => {
  const { data: profile } = useSuspenseQuery(profileQueries.me())
  const { data: dermo } = useQuery(profileQueries.dermo())
  const updateProfile = useUpdateProfile()
  const announce = useAnnounce()
  // Tab lives in the URL so HomeHub doorways can deep-link straight to it (e.g.
  // the "Activer la découverte" doorway lands on the account tab where the
  // discoverable toggle sits).
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
      <ProfileHero
        displayName={displayName}
        avatarUrl={profile.avatarUrl}
        username={profile.username}
        createdAt={profile.createdAt}
        fitzpatrickType={dermo?.fitzpatrickType}
      />

      <Tabs
        options={tabOptions}
        activeTab={activeTab}
        onTabChange={(next) => navigate({ search: (prev) => ({ ...prev, tab: next }) })}
        variant="underline"
        className="profile-tabs-container"
        idPrefix="profile-tab"
      />

      <div className="profile-dashboard__body">
        <TabPanel
          id="profile"
          activeTab={activeTab}
          idPrefix="profile-tab"
          className="profile-tab-content"
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
        </TabPanel>

        <TabPanel
          id="preferences"
          activeTab={activeTab}
          idPrefix="profile-tab"
          label="Réglages"
          className="profile-tab-content"
        >
          <PreferenceSettings />
        </TabPanel>

        <TabPanel
          id="account"
          activeTab={activeTab}
          idPrefix="profile-tab"
          label="Compte"
          className="profile-tab-content"
        >
          <AccountSettings />
        </TabPanel>

        <TabPanel
          id="people"
          activeTab={activeTab}
          idPrefix="profile-tab"
          label="Des gens comme vous"
          className="profile-tab-content"
        >
          {/* Lazy-mount: don't fetch the cohort until the tab is opened. */}
          {activeTab === 'people' && <SimilarPeople />}
        </TabPanel>
      </div>
    </main>
  )
}
