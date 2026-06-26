import { useQuery } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useLogout } from '@/lib/queries/auth'
import {
  useDeleteUser,
  useDownloadDataExport,
  useUpdatePrivacySettings,
} from '@/lib/queries/profile'
import { AccountSettings } from '../AccountSettings'

vi.mock('@tanstack/react-router', () => ({
  // Button.tsx calls createLink at module load; stub so the import doesn't throw.
  createLink: vi.fn(() => vi.fn(({ children }) => children)),
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useNavigate: () => vi.fn(),
}))

vi.mock('@tanstack/react-query', async () => {
  const actual =
    await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query')
  return { ...actual, useQuery: vi.fn() }
})

vi.mock('@/lib/queries/auth', () => ({
  useLogout: vi.fn(),
}))

vi.mock('@/lib/queries/profile', () => ({
  privacySettingsQueries: {
    get: () => ({ queryKey: ['profile', 'privacy'], queryFn: vi.fn() }),
  },
  useDeleteUser: vi.fn(),
  useDownloadDataExport: vi.fn(),
  useUpdatePrivacySettings: vi.fn(),
  ExportRateLimitError: class extends Error {
    retryAfterSec = 0
  },
}))

// The Compte tab renders RoleRequestSection for role==='user'; stub its data hooks
// so this privacy-focused unit test needs no QueryClient.
vi.mock('@/lib/queries/role-requests', () => ({
  roleRequestQueries: { mine: () => ({ queryKey: ['role-requests', 'me'], queryFn: vi.fn() }) },
  useSubmitRoleRequest: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useCancelRoleRequest: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
}))

const ALL_FLAGS_OFF = {
  profilePublic: false,
  bioPublic: false,
  avatarPublic: false,
  linksPublic: false,
  skinTypesPublic: false,
  fitzpatrickPublic: false,
  skinConcernsPublic: false,
  discoverable: false,
  aiConsent: false,
}

function mountWithPrivacy(privacy: typeof ALL_FLAGS_OFF) {
  const mutate = vi.fn()
  vi.mocked(useQuery).mockReturnValue({
    data: privacy,
    isLoading: false,
  } as unknown as ReturnType<typeof useQuery>)
  vi.mocked(useUpdatePrivacySettings).mockReturnValue({
    mutate,
    isPending: false,
    isError: false,
  } as unknown as ReturnType<typeof useUpdatePrivacySettings>)
  vi.mocked(useDeleteUser).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useDeleteUser>)
  vi.mocked(useDownloadDataExport).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  } as unknown as ReturnType<typeof useDownloadDataExport>)
  vi.mocked(useLogout).mockReturnValue({
    mutate: vi.fn(),
  } as unknown as ReturnType<typeof useLogout>)
  render(<AccountSettings />)
  return mutate
}

describe('AccountSettings privacy granular toggles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('disables every sub-toggle when master profilePublic is off', () => {
    mountWithPrivacy(ALL_FLAGS_OFF)

    for (const label of [
      /^Bio$/,
      /^Avatar$/,
      /^Liens$/,
      /Types de peau/,
      /Phototype/,
      /Préoccupations/,
      /trouvable/i,
    ]) {
      expect(screen.getByRole('switch', { name: label })).toBeDisabled()
    }
    expect(screen.getByRole('switch', { name: /Profil public/ })).not.toBeDisabled()
  })

  it('enables sub-toggles once master is on', () => {
    mountWithPrivacy({ ...ALL_FLAGS_OFF, profilePublic: true })

    for (const label of [
      /^Bio$/,
      /^Avatar$/,
      /^Liens$/,
      /Types de peau/,
      /Phototype/,
      /Préoccupations/,
      /trouvable/i,
    ]) {
      expect(screen.getByRole('switch', { name: label })).not.toBeDisabled()
    }
  })

  it('opting in to discoverable updates only that flag', () => {
    const mutate = mountWithPrivacy({ ...ALL_FLAGS_OFF, profilePublic: true })

    fireEvent.click(screen.getByRole('switch', { name: /trouvable/i }))

    expect(mutate).toHaveBeenCalledWith({ discoverable: true })
  })
})
