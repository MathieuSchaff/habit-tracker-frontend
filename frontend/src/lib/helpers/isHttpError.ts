export function isHttpError(err: unknown, status: number): err is Error & { status: number } {
  return (
    err instanceof Error && 'status' in err && (err as Error & { status: number }).status === status
  )
}
