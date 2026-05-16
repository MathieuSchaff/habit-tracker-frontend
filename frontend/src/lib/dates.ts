// API contract: every wire date is ISO 8601 UTC. Calendar dates round to
// midnight UTC ("YYYY-MM-DDT00:00:00.000Z"). Native <input type="date"> only
// understands "YYYY-MM-DD", so forms must convert at the boundary.

export function toDateInputValue(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : ''
}

export function fromDateInputValue(yyyymmdd: string): string {
  return `${yyyymmdd}T00:00:00.000Z`
}

export function todayDateInputValue(): string {
  return new Date().toISOString().slice(0, 10)
}

// Display
// Locale always FR — components must not fall back to browser locale.

type FormatStyle = 'short' | 'medium' | 'long' | 'monthYear'

const FORMAT_OPTIONS: Record<FormatStyle, Intl.DateTimeFormatOptions> = {
  short: { day: '2-digit', month: '2-digit', year: 'numeric' },
  medium: { day: 'numeric', month: 'short', year: 'numeric' },
  long: { day: 'numeric', month: 'long', year: 'numeric' },
  monthYear: { month: 'long', year: 'numeric' },
}

export function formatInstant(
  iso: string | null | undefined,
  style: FormatStyle = 'short'
): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat('fr-FR', FORMAT_OPTIONS[style]).format(new Date(iso))
}

// ISO 8601 UTC strings sort lexicographically — no Date allocation needed.
// Use `compareInstant(b, a)` for descending (most recent first).
export function compareInstant(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}
