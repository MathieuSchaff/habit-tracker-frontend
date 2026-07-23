import type { UserPublic } from '@aurore/shared'

import { create } from 'zustand'

interface BanDetails {
  expiresAt: string | null
  reason: string | null
}

interface AuthStore {
  accessToken: string | null
  tokenExpiresAt: number | null
  user: UserPublic | null
  emailVerified: boolean
  role: 'user' | 'admin' | 'contributor'
  isDemo: boolean
  // Latched after client boot decides whether a refresh is needed.
  bootRefreshAttempted: boolean
  // True only while the boot probe is in flight (hint user, cold load); drives the neutral nav
  // skeleton and defers loader convergence (router.invalidate) until the probe settles.
  bootRefreshPending: boolean
  // Set when 401-recovery refresh fails on a live session; RootComponent redirects to /auth/login.
  sessionExpired: boolean
  // Set when a 403 banned response is received; RootComponent redirects to /auth/banned.
  banned: boolean
  bannedDetails: BanDetails | null

  setAuth: (token: string, user: UserPublic) => void
  clearAuth: () => void
  markBootRefreshAttempted: () => void
  setBootRefreshPending: (pending: boolean) => void
  markSessionExpired: () => void
  clearSessionExpired: () => void
  markBanned: (details: BanDetails) => void
  clearBanned: () => void
}

function decodeTokenExp(token: string): number | null {
  try {
    // JWT payload is base64url (RFC 7519 §3); convert to standard base64 for atob.
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(b64))
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

export const useAuthStore = create<AuthStore>((set) => ({
  accessToken: null,
  tokenExpiresAt: null,
  user: null,
  emailVerified: false,
  role: 'user',
  isDemo: false,
  bootRefreshAttempted: false,
  bootRefreshPending: false,
  sessionExpired: false,
  banned: false,
  bannedDetails: null,

  setAuth: (token, user) =>
    set({
      accessToken: token,
      tokenExpiresAt: decodeTokenExp(token),
      user,
      emailVerified: user.emailVerified,
      role: user.role,
      isDemo: user.isDemo ?? false,
      bootRefreshAttempted: true,
      bootRefreshPending: false,
      sessionExpired: false,
    }),

  // Keep boot latch on after logout to avoid re-probing for a session we know is gone.
  clearAuth: () =>
    set({
      accessToken: null,
      tokenExpiresAt: null,
      user: null,
      emailVerified: false,
      role: 'user',
      isDemo: false,
      bootRefreshAttempted: true,
      bootRefreshPending: false,
    }),

  markBootRefreshAttempted: () => set({ bootRefreshAttempted: true }),
  setBootRefreshPending: (pending) => set({ bootRefreshPending: pending }),
  markSessionExpired: () => set({ sessionExpired: true }),
  clearSessionExpired: () => set({ sessionExpired: false }),
  markBanned: (details) => set({ banned: true, bannedDetails: details }),
  clearBanned: () => set({ banned: false, bannedDetails: null }),
}))
