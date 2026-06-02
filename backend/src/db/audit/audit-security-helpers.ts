import { sanitizeUrl } from '@braintree/sanitize-url'

export function isMaliciousUrl(value: string | null | undefined): value is string {
  if (!value) return false
  return sanitizeUrl(value) === 'about:blank'
}

export function isHttpUrl(value: string | null | undefined): value is string {
  if (!value) return false
  return /^http:\/\//i.test(value)
}

// Requires a letter after < so chemistry notation (<1%, <5°C, <3 ans) is not
// flagged as a false positive. Encoded variants (&#60;script) are safe in JSX
// text nodes, React does not decode HTML entities there.
export const HTML_TAG_RE = /<[a-z][^>]*>/i

export function hasSuspiciousHtml(value: string | null | undefined): value is string {
  if (!value) return false
  return HTML_TAG_RE.test(value)
}

// Article content is intentionally HTML, look for dangerous patterns specifically.
export const DANGEROUS_CONTENT_PATTERNS = [
  /<script[\s>]/i,
  /\bon\w+\s*=/i,
  /href\s*=\s*["']?\s*javascript:/i,
  /src\s*=\s*["']?\s*(javascript:|data:)/i,
]

export function hasDangerousHtmlContent(value: string | null | undefined): value is string {
  if (!value) return false
  return DANGEROUS_CONTENT_PATTERNS.some((re) => re.test(value))
}

// Bare URLs in text fields: spam vector, and dangerous if the frontend ever auto-links.
export const EMBEDDED_URL_RE = /https?:\/\/[^\s]{5,}/i

export function preview(value: string, max = 80): string {
  return value.length > max ? `${value.slice(0, max)}…` : value
}

// Text-field cleaner, NOT an HTML sanitizer. Strips tags from values that should
// never contain HTML (names, brands, bios). Article HTML content is intentionally
// left intact and rendered safely via react-markdown without rehype-raw.
export function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
