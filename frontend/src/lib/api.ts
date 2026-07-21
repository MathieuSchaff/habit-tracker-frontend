import type { AppType } from '@aurore/backend'

import { hc, type InferResponseType } from 'hono/client'

import { isRefreshEndpoint } from '@/lib/auth/helpers'
import { markBanIfBanned } from '@/lib/auth/markBanIfBanned'
import { recoverUnauthorized } from '@/lib/auth/recoverUnauthorized'
import { httpClient } from '@/lib/httpClient'
import { useAuthStore } from '../store/auth'

async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await httpClient(input, init)

  // SSR renders anonymous public pages: there is no session to refresh or
  // ban to flag, and the store + refresh backoff are module state shared by
  // concurrent requests. Pass errors through untouched.
  if (import.meta.env.SSR) return res

  if (res.status === 403) {
    await markBanIfBanned(res)
    return res
  }
  // Don't retry the refresh POST itself: a 401 there means the refresh cookie is dead,
  // and retrying would loop refresh -> 401 -> refresh forever.
  if (res.status !== 401 || isRefreshEndpoint(input)) return res
  return recoverUnauthorized(res, input, init)
}
const apiBase = import.meta.env.SSR ? import.meta.env.VITE_API_URL : '/'
if (!apiBase) {
  throw new Error('VITE_API_URL is required for server-side API requests')
}
const client = hc<AppType>(apiBase, {
  fetch: authFetch,
  // Read token per request so refreshes between calls are picked up without rebuilding the client.
  headers: (): Record<string, string> => {
    const token = useAuthStore.getState().accessToken
    return token ? { Authorization: `Bearer ${token}` } : {}
  },
})
export const api = client.api

export type ApiData<T> = Extract<InferResponseType<T>, { data: unknown }>['data']
