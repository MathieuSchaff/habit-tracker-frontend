// Extracts the `filename` parameter from a Content-Disposition header. Only
// handles the unquoted and double-quoted forms because that is all our backend
// emits — RFC 5987 (UTF-8 percent-encoded) is unused server-side. Returns null
// when the header is missing or unparseable so callers can fall back.
export function parseAttachmentFilename(header: string | null | undefined): string | null {
  if (!header) return null
  const match = /filename\s*=\s*("([^"]+)"|([^;]+))/i.exec(header)
  if (!match) return null
  const value = (match[2] ?? match[3] ?? '').trim()
  return value.length > 0 ? value : null
}

// Triggers a browser download from an in-memory Blob. Uses an off-DOM anchor
// (no insertion -> no transient layout flash). The object URL is revoked on
// the next microtask so Safari has time to start the download before the
// blob is freed.
export function downloadBlobAsFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
