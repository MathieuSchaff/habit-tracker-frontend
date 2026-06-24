import type { AppType } from '@aurore/backend'

import { hc, type InferResponseType } from 'hono/client'

import { ensureFresh } from '@/lib/auth/freshness'
import { httpClient } from '@/lib/httpClient'
import { useAuthStore } from '../store/auth'
import { queryClient } from './queryClient'

// Skip the refresh endpoint itself, otherwise a 401 from a stale cookie loops forever.
function isRefreshEndpoint(input: RequestInfo | URL): boolean {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  return url.includes('/api/auth/refresh')
}
// https://bun.com/reference/globals/RequestInit
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
  const res = await httpClient(input, init)

  if (res.status === 403) {
    try {
      const body = (await res.clone().json()) as {
        success?: boolean
        error?: string
        details?: { expiresAt?: string | null; reason?: string | null }
      }
      if (body?.error === 'banned') {
        useAuthStore.getState().markBanned({
          expiresAt: body.details?.expiresAt ?? null,
          reason: body.details?.reason ?? null,
        })
      }
    } catch {
      // Non-JSON 403 - ignore, pass through to caller.
    }
    return res
  }
  // Skip 401-recovery in two independent cases:
  //   1. status isn't 401 → nothing to recover.
  //   2. the request IS the refresh POST itself → a 401 here means the refresh
  //      cookie is dead. Trying to recover would re-call refresh → 401 → re-call → ∞.
  // The two clauses test different things: clause 1 reads res.status, clause 2 reads
  // the URL (isRefreshEndpoint), not the status.
  if (res.status !== 401 || isRefreshEndpoint(input)) return res

  const hadSession = useAuthStore.getState().accessToken != null

  // ensureFresh dedupes concurrent calls so parallel 401s share one refresh.
  const result = await ensureFresh(queryClient)
  if (result !== 'ok') {
    // Anonymous boot probes also hit 401; don't redirect them to login.
    if (result === 'failed' && hadSession) useAuthStore.getState().markSessionExpired()
    return res
  }

  const token = useAuthStore.getState().accessToken
  return httpClient(input, withAuthHeader(init, token))
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

export type ApiData<T> = Extract<InferResponseType<T>, { data: unknown }>['data']
