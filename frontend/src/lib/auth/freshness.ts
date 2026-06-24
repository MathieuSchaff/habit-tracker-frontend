import type { UserPublic } from '@aurore/shared'

import type { QueryClient } from '@tanstack/react-query'

import { httpClient } from '@/lib/httpClient'
import { useAuthStore } from '../../store/auth'

export type RefreshResult = 'ok' | 'failed' | 'cooldown'

// Manual wire type: a typed `api.*` import here would re-introduce the api <-> freshness cycle.
type RefreshResponse =
  | { success: true; data: { accessToken: string; user: UserPublic } }
  | { success: false; error: string }

// Injected so freshness decisions are deterministic in tests without patching the global Date.
export interface Clock {
  now(): number
}

const systemClock: Clock = { now: () => Date.now() }
let clock: Clock = systemClock

// Treat a token as expired this far ahead of its real exp (clock skew + in-flight safety).
const EXPIRY_BUFFER_MS = 30_000
// Schedule the proactive refresh this far before expiry.
const PROACTIVE_LEAD_MS = 60_000

// Dedupe concurrent refresh triggers across components.
let inflightRefresh: Promise<RefreshResult> | null = null

// Exponential backoff: 1s → 2s → 4s → … → 30s cap.
let failureCount = 0
let retryAfter = 0

function recordFailure(): void {
  failureCount++
  retryAfter = clock.now() + Math.min(1000 * 2 ** (failureCount - 1), 30_000)
}

// Test-only: module-level state otherwise leaks across tests in the same file.
export function __resetFreshness() {
  inflightRefresh = null
  failureCount = 0
  retryAfter = 0
}

// Test-only: swap the clock; pass null to restore the system clock.
export function __setClock(c: Clock | null) {
  clock = c ?? systemClock
}

export function isExpired(bufferMs = EXPIRY_BUFFER_MS): boolean {
  const exp = useAuthStore.getState().tokenExpiresAt
  if (!exp) return true
  return clock.now() > exp - bufferMs
}

// ms until the proactive refresh should fire; <= 0 means refresh now.
export function msUntilProactiveRefresh(expiresAt: number): number {
  return expiresAt - clock.now() - PROACTIVE_LEAD_MS
}

// Never rejects: failures resolve to 'failed'/'cooldown'. Guards that await this won't throw,
// so they fall through to their own redirect instead of an error-boundary ejection.
export async function ensureFresh(queryClient: QueryClient): Promise<RefreshResult> {
  if (inflightRefresh) return inflightRefresh
  // Cooldown window after recent failure - callers decide whether to wait or log out.
  if (clock.now() < retryAfter) return 'cooldown'

  inflightRefresh = (async (): Promise<RefreshResult> => {
    try {
      const res = await httpClient('/api/auth/refresh', {
        method: 'POST',
      })
      if (!res.ok) {
        recordFailure()
        return 'failed'
      }

      const json = (await res.json()) as RefreshResponse
      if (!json.success) {
        recordFailure()
        return 'failed'
      }

      const { accessToken, user } = json.data

      useAuthStore.getState().setAuth(accessToken, user)
      queryClient.setQueryData(['session'], { authenticated: true, userId: user.id })

      failureCount = 0
      retryAfter = 0
      return 'ok'
    } catch {
      recordFailure()
      return 'failed'
    } finally {
      inflightRefresh = null
    }
  })()

  return inflightRefresh
}
