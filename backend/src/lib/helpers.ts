/**
 * I use this to see if the error is because a value already exists in the database.
 * PostgreSQL uses the code 23505 for unique problems.
 */
export function isUniqueViolation(e: unknown): boolean {
  if (!(e instanceof Error)) return false

  const getErrorCode = (err: unknown) => {
    if (typeof err !== 'object' || err === null) return undefined
    const e = err as Record<string, unknown>
    return e.errno || e.code
  }

  // Drizzle often hides the real error inside the "cause" property, so I check there first.
  if ('cause' in e && e.cause instanceof Error) {
    return getErrorCode(e.cause) === '23505'
  }

  return getErrorCode(e) === '23505'
}

/**
 * Normal comparison doesn't work well for Dates because they are objects.
 * I use this to check if two things are really the same.
 */
export function areEqual(a: unknown, b: unknown): boolean {
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime()
  return a === b
}
