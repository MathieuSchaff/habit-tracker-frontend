import type { AppType } from '@habit-tracker/backend'

import { hc } from 'hono/client'

import { useAuthStore } from '../store/auth'
import { silentRefresh } from './queries/silentRefresh'
import { queryClient } from './queryClient'

// Skip the refresh endpoint itself, otherwise a 401 from a stale cookie loops forever.
function isRefreshEndpoint(input: RequestInfo | URL): boolean {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  return url.includes('/api/auth/refresh')
}

// The original `init` was built with the OLD token by the `headers` callback below.
// After a refresh, the retry must overwrite Authorization with the NEW token.
function withAuthHeader(init: RequestInit | undefined, token: string | null): RequestInit {
  const headers = new Headers(init?.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  else headers.delete('Authorization')
  return { ...init, headers }
}

// On 401, try a single silent refresh + retry before surfacing the failure.
// Covers clock skew, server-side revocation, backend restart.
async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init)
  if (res.status !== 401 || isRefreshEndpoint(input)) return res

  // silentRefresh dedupes concurrent calls internally, so parallel 401s share one refresh.
  const result = await silentRefresh(queryClient)
  if (result !== 'ok') return res

  const token = useAuthStore.getState().accessToken
  return fetch(input, withAuthHeader(init, token))
}

const client = hc<AppType>('/', {
  fetch: authFetch,
  // Read the token per request so a refresh between calls is picked up without rebuilding the client.
  headers: (): Record<string, string> => {
    const token = useAuthStore.getState().accessToken
    return token ? { Authorization: `Bearer ${token}` } : {}
  },
})
export const api = client.api
