/**
 * Type guard to check if an unknown error has a specific HTTP status.
 * Used in catch blocks so we don't need `any` to read the status.
 */
export function isHttpError(err: unknown, status: number): err is Error & { status: number } {
  return (
    err instanceof Error && 'status' in err && (err as Error & { status: number }).status === status
  )
}
