/**
 * Lets us safely read the HTTP status from an unknown catch error without casting to `any`.
 */
export function isHttpError(err: unknown, status: number): err is Error & { status: number } {
  return (
    err instanceof Error && 'status' in err && (err as Error & { status: number }).status === status
  )
}
