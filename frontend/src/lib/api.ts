import type { AppType } from '@habit-tracker/backend'

import { hc } from 'hono/client'

import { useAuthStore } from '../store/auth'

const client = hc<AppType>('/', {
  headers: (): Record<string, string> => {
    const token = useAuthStore.getState().accessToken
    return token ? { Authorization: `Bearer ${token}` } : {}
  },
})
export const api = client.api
