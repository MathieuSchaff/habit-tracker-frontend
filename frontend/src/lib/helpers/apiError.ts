// Backend failure envelope: `{ success: false, error: <code>, details? }`.
// See backend/src/utils/errors/error-handler.ts.
export class ApiError extends Error {
  status: number
  code: string
  details?: unknown

  constructor(code: string, status: number, details?: unknown) {
    super(code)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError
}

export async function throwIfNotOk(res: Response, fallbackCode = 'http_error'): Promise<void> {
  if (res.ok) return
  let code = fallbackCode
  let details: unknown
  try {
    const body = (await res.json()) as { success?: boolean; error?: string; details?: unknown }
    if (body && body.success === false && typeof body.error === 'string') {
      code = body.error
      details = body.details
    }
  } catch {
    // Non-JSON body - fall back to status-only branching.
  }
  throw new ApiError(code, res.status, details)
}

// Retry-after seconds off a 429 `rate_limit_exceeded` ApiError (backend envelope
// `details.retryAfter`), for "réessayez dans Ns" UI. null when the error isn't a rate-limit.
export function isRateLimitError(err: unknown): boolean {
  return isApiError(err) && err.code === 'rate_limit_exceeded'
}

// Backend puts Retry-After (an HTTP header) under details.retryAfter, so it's a string — or
// null when the header is absent. Coerce; return null when no usable delay is available.
export function rateLimitRetryAfter(err: unknown): number | null {
  if (!isRateLimitError(err)) return null
  const raw = ((err as ApiError).details as { retryAfter?: number | string | null } | undefined)
    ?.retryAfter
  const sec = typeof raw === 'string' ? Number(raw) : raw
  return typeof sec === 'number' && Number.isFinite(sec) ? sec : null
}

// "5 min" for ≥60s, "30 s" otherwise — avoids ugly "300 secondes" in retry copy.
export function formatRetryDelay(seconds: number): string {
  return seconds >= 60 ? `${Math.ceil(seconds / 60)} min` : `${seconds} s`
}

// Inline rate-limit message for search dropdowns; null when the error isn't a 429. The delay
// is best-effort: the Retry-After header can be absent, so fall back to a vague reassurance.
export function rateLimitMessage(err: unknown): string | null {
  if (!isRateLimitError(err)) return null
  const sec = rateLimitRetryAfter(err)
  return sec === null
    ? 'Trop de requêtes — réessayez dans un instant.'
    : `Trop de requêtes — réessayez dans ${formatRetryDelay(sec)}.`
}

// Maps backend error codes to user-facing messages, optionally targeting a form field.
export type FormErrorMap<F extends string = string> = Record<string, { field?: F; message: string }>

export function extractFormError<F extends string>(
  err: unknown,
  map: FormErrorMap<F>,
  fallback = 'Une erreur est survenue lors de la sauvegarde.'
): { field?: F; message: string } {
  if (isApiError(err) && err.code in map) {
    const entry = map[err.code]
    if (entry) return entry as { field?: F; message: string }
  }
  return { message: err instanceof Error ? err.message : fallback }
}
