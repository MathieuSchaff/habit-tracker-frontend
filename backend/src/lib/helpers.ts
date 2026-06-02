export function isUniqueViolation(e: unknown): boolean {
  if (!(e instanceof Error)) return false

  const getErrorCode = (err: unknown) => {
    if (typeof err !== 'object' || err === null) return undefined
    const e = err as Record<string, unknown>
    return e.errno || e.code
  }

  // Drizzle wraps the driver error in `cause`.
  if ('cause' in e && e.cause instanceof Error) {
    return getErrorCode(e.cause) === '23505'
  }

  return getErrorCode(e) === '23505'
}

// Escape LIKE/ILIKE metacharacters so user input is matched literally.
export function escapeLike(s: string): string {
  return s.replace(/[%_\\]/g, '\\$&')
}

export function areEqual(a: unknown, b: unknown): boolean {
  return a === b
}
