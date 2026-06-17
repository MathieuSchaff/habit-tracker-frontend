import { Clock } from 'lucide-react'

import { formatRetryDelay, rateLimitRetryAfter } from '@/lib/helpers/apiError'
import { EmptyState } from './EmptyState'

// Shown when a list read is rate-limited (429): the catalogue isn't empty, the request was
// throttled. Says so with the retry window (best-effort — Retry-After can be absent) instead of
// the misleading "come back later" empty.
export function RateLimitEmptyState({ error }: { error: unknown }) {
  const retryAfter = rateLimitRetryAfter(error)
  return (
    <EmptyState
      icon={<Clock size={24} />}
      title="Trop de requêtes"
      subtitle={
        retryAfter === null
          ? 'Patientez un instant puis réessayez.'
          : `Patientez puis réessayez dans ${formatRetryDelay(retryAfter)}.`
      }
    />
  )
}
