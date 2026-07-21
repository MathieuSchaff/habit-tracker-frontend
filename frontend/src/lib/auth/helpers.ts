// https://bun.com/reference/globals/RequestInit
// Retry after refresh must overwrite Authorization with the new token.
export function withAuthHeader(init: RequestInit | undefined, token: string | null): RequestInit {
  const headers = new Headers(init?.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  else headers.delete('Authorization')
  return { ...init, headers }
}

// Skip the refresh endpoint itself, otherwise a 401 from a stale cookie loops forever.
export function isRefreshEndpoint(input: RequestInfo | URL): boolean {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  return url.includes('/api/auth/refresh')
}
