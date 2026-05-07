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
  // Latch flipped after the first silent-refresh probe at boot, so subsequent navigations
  // don't re-fire /auth/refresh on every click when the user has no session cookie.
  bootRefreshAttempted: boolean
  // Set when authFetch's 401-recovery silent refresh fails after the user had a live
  // session. RootComponent watches this and redirects to /auth/login.
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
    // JWT payload is base64url-encoded (RFC 7519 §3); atob only accepts standard base64,
    // so swap `-_` back to `+/` before decoding to avoid silent failures on tokens that
    // happen to contain those chars.
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

  // After logout we know there's no session — keep the latch on to avoid re-probing.
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
