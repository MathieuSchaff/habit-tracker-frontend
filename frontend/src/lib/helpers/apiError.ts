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
    // Non-JSON body — fall back to status-only branching.
  }
  throw new ApiError(code, res.status, details)
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
