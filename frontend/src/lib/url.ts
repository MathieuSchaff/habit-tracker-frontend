// Prevents XSS via javascript: or data: protocols in href/src attributes.
// Returns null for any URL that isn't http(s) — callers should skip rendering.
export function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url) return null
  return /^https?:\/\//.test(url) ? url : null
}
