import type { UserPublic } from '@habit-tracker/shared'

import { create } from 'zustand'

interface AuthStore {
  accessToken: string | null
  tokenExpiresAt: number | null
  user: UserPublic | null
  emailVerified: boolean
  role: 'user' | 'admin'
  isAdmin: boolean
  isDemo: boolean
  // Latched after the first boot-time silent-refresh probe so unauthenticated nav doesn't re-fire /auth/refresh.
  bootRefreshAttempted: boolean
  // Set when 401-recovery refresh fails on a live session; RootComponent redirects to /auth/login.
  sessionExpired: boolean

  setAuth: (token: string, user: UserPublic) => void
  clearAuth: () => void
  markBootRefreshAttempted: () => void
  markSessionExpired: () => void
  clearSessionExpired: () => void
  isTokenExpired: () => boolean
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

export const useAuthStore = create<AuthStore>((set, get) => ({
  accessToken: null,
  tokenExpiresAt: null,
  user: null,
  emailVerified: false,
  role: 'user',
  isAdmin: false,
  isDemo: false,
  bootRefreshAttempted: false,
  sessionExpired: false,

  setAuth: (token, user) =>
    set({
      accessToken: token,
      tokenExpiresAt: decodeTokenExp(token),
      user,
      emailVerified: user.emailVerified,
      role: user.role,
      isAdmin: user.role === 'admin',
      isDemo: user.isDemo ?? false,
      bootRefreshAttempted: true,
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
      isAdmin: false,
      isDemo: false,
      bootRefreshAttempted: true,
    }),

  markBootRefreshAttempted: () => set({ bootRefreshAttempted: true }),
  markSessionExpired: () => set({ sessionExpired: true }),
  clearSessionExpired: () => set({ sessionExpired: false }),

  isTokenExpired: () => {
    const exp = get().tokenExpiresAt
    if (!exp) return true
    return Date.now() > exp - 30_000
  },
}))
