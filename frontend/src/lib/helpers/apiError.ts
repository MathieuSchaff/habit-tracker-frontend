// Backend always responds with `{ success: false, error: <code>, details? }`
// for failures (see backend/src/utils/errors/error-handler.ts). This module
// turns that envelope into a typed `ApiError` so callers can branch on
// `err.code` / `err.status` instead of regexing message strings.

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
    // Non-JSON body — keep the fallback code; status alone is enough to branch.
  }
  throw new ApiError(code, res.status, details)
}

// Maps backend error codes to user-facing messages, optionally targeting a form
// field so the UI can highlight that input. Unmapped codes fall through to the
// caller's generic fallback.
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
