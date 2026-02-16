import { hc } from 'hono/client'

import type { AppType } from '../../../backend/src'
import { useAuthStore } from '../store/auth'

// https://hono.dev/docs/guides/rpc
const client = hc<AppType>('/', {
  headers: (): Record<string, string> => {
    const token = useAuthStore.getState().accessToken
    return token ? { Authorization: `Bearer ${token}` } : {}
  },
})
export const api = client.api
