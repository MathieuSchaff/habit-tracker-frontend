import type { UserPublic } from '@habit-tracker/shared'

import { create } from 'zustand'

interface AuthStore {
  accessToken: string | null
  tokenExpiresAt: number | null
  user: UserPublic | null

  setAuth: (token: string, user: UserPublic) => void
  clearAuth: () => void
  isTokenExpired: () => boolean
}

function decodeTokenExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  accessToken: null,
  tokenExpiresAt: null,
  user: null,

  setAuth: (token, user) =>
    set({
      accessToken: token,
      tokenExpiresAt: decodeTokenExp(token),
      user,
    }),

  clearAuth: () =>
    set({
      accessToken: null,
      tokenExpiresAt: null,
      user: null,
    }),

  // Marge de 30s pour éviter les race conditions
  isTokenExpired: () => {
    const exp = get().tokenExpiresAt
    if (!exp) return true
    return Date.now() > exp - 30_000
  },
}))
