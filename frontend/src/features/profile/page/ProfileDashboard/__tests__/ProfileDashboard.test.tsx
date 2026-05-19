import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useUpdateProfile } from '@/lib/queries/profile'
import { ProfileDashboard } from '../ProfileDashboard'

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return { ...actual, useQuery: vi.fn(), useSuspenseQuery: vi.fn() }
})

vi.mock('@/lib/queries/profile', () => ({
  profileQueries: {
    me: vi.fn(() => ({ queryKey: ['profile', 'me'] })),
    dermo: vi.fn(() => ({ queryKey: ['profile', 'dermo'] })),
  },
  useUpdateProfile: vi.fn(),
}))

// Sub-components are composition leaves; stub them out so the dashboard's
// own wiring (hero, tabs, edit state) is what's under test.
vi.mock('../../../components/ProfileAvatar/ProfileAvatar', () => ({
  ProfileAvatar: ({ username }: { username?: string }) => (
    <div data-testid="profile-avatar">{username}</div>
  ),
}))
vi.mock('../../../components/SkinProfileRead/SkinProfileRead', () => ({
  SkinProfileRead: () => <div data-testid="skin-read" />,
}))
vi.mock('../../../components/ProfileForm/ProfileForm', () => ({
  ProfileForm: ({ onSubmit }: { onSubmit: (data: { bio: string }) => void }) => (
    <button type="button" onClick={() => onSubmit({ bio: 'new bio' })}>
      submit-profile-form
    </button>
  ),
}))
vi.mock('../../../components/ProfileCompletionHint/ProfileCompletionHint', () => ({
  ProfileCompletionHint: () => <div data-testid="profile-completion-hint" />,
}))
vi.mock('../../../tabs/OverviewTab/ProfileStats', () => ({
  ProfileStats: () => <div data-testid="profile-stats" />,
}))
vi.mock('../../../tabs/AccountTab/AccountSettings', () => ({
  AccountSettings: () => <div data-testid="account-settings" />,
}))
vi.mock('../../../tabs/PreferencesTab/PreferenceSettings', () => ({
  PreferenceSettings: () => <div data-testid="preference-settings" />,
}))
vi.mock('../../../tabs/SkinTab/DermoProfileForm', () => ({
  DermoProfileForm: () => <div data-testid="dermo-form" />,
}))

function setProfile(profile: {
  username?: string
  bio?: string | null
  avatarUrl?: string | null
  createdAt?: string
  links?: Array<{ url: string; label: string }>
}) {
  vi.mocked(useSuspenseQuery).mockReturnValue({
    data: {
      username: profile.username ?? 'mathieu',
      bio: profile.bio ?? null,
      avatarUrl: profile.avatarUrl ?? null,
      createdAt: profile.createdAt ?? null,
      links: profile.links ?? [],
    },
  } as unknown as ReturnType<typeof useSuspenseQuery>)
}

function setDermo(dermo: unknown) {
  vi.mocked(useQuery).mockReturnValue({
    data: dermo,
    isLoading: false,
  } as unknown as ReturnType<typeof useQuery>)
}

function setUpdateProfile(overrides: Partial<ReturnType<typeof useUpdateProfile>> = {}) {
  const mutate = vi.fn()
  const reset = vi.fn()
  vi.mocked(useUpdateProfile).mockReturnValue({
    mutate,
    reset,
    isPending: false,
    isError: false,
    ...overrides,
  } as unknown as ReturnType<typeof useUpdateProfile>)
  return { mutate, reset }
}

describe('ProfileDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setProfile({ bio: 'Hello world' })
    setDermo(null)
    setUpdateProfile()
  })

  it('renders the profile hero with username and bio', () => {
    setProfile({ username: 'mathieu', bio: 'Skincare nerd' })
    render(<ProfileDashboard />)

    expect(screen.getByRole('heading', { name: 'mathieu' })).toBeInTheDocument()
    // The bio renders both in the hero and in the read view of EditableSection.
    expect(screen.getAllByText('Skincare nerd').length).toBeGreaterThanOrEqual(1)
  })

  it('switches tab panels when a tab is clicked', () => {
    render(<ProfileDashboard />)

    // Account tab hidden by default.
    expect(screen.getByTestId('account-settings').closest('[role="tabpanel"]')).toHaveAttribute(
      'hidden'
    )

    fireEvent.click(screen.getByRole('tab', { name: /Compte/ }))

    expect(screen.getByTestId('account-settings').closest('[role="tabpanel"]')).not.toHaveAttribute(
      'hidden'
    )
  })

  it('fires updateProfile.mutate when the inline ProfileForm submits', () => {
    const { mutate } = setUpdateProfile()
    render(<ProfileDashboard />)

    // Two EditableSections render their own edit button — first one is the hero.
    const [editHero] = screen.getAllByRole('button', { name: /Modifier/ })
    fireEvent.click(editHero)
    fireEvent.click(screen.getByText('submit-profile-form'))

    expect(mutate).toHaveBeenCalledTimes(1)
    expect(mutate.mock.calls[0][0]).toEqual({ bio: 'new bio' })
  })
})
