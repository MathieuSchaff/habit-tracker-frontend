import type { AppType } from '@habit-tracker/backend'

import { hc } from 'hono/client'

import { useAuthStore } from '../store/auth'
import { queryClient } from './queryClient'

// Skip the refresh endpoint itself, otherwise a 401 from a stale cookie loops forever.
function isRefreshEndpoint(input: RequestInfo | URL): boolean {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  return url.includes('/api/auth/refresh')
}

// Retry after refresh must overwrite Authorization with the new token.
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

  const hadSession = useAuthStore.getState().accessToken != null

  // Lazy import breaks the api ↔ silentRefresh circular init order.
  // fallow-ignore-next-line circular-dependencies
  const { silentRefresh } = await import('./queries/silentRefresh')
  // silentRefresh dedupes concurrent calls so parallel 401s share one refresh.
  const result = await silentRefresh(queryClient)
  if (result !== 'ok') {
    // Anonymous boot probes also hit 401; don't redirect them to login.
    if (result === 'failed' && hadSession) useAuthStore.getState().markSessionExpired()
    return res
  }

  const token = useAuthStore.getState().accessToken
  return fetch(input, withAuthHeader(init, token))
}

const client = hc<AppType>('/', {
  fetch: authFetch,
  // Read token per request so refreshes between calls are picked up without rebuilding the client.
  headers: (): Record<string, string> => {
    const token = useAuthStore.getState().accessToken
    return token ? { Authorization: `Bearer ${token}` } : {}
  },
})
export const api = client.api
