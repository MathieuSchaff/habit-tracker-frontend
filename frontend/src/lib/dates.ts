import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

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

// ISO instant for now — use when writing wire dates from the frontend.
// Wraps the only sanctioned `new Date().toISOString()` call so components
// stay free of raw Date allocations.
export function nowInstant(): string {
  return new Date().toISOString()
}

// `<input type="datetime-local">` returns a tz-naive local string
// ("2026-05-22T14:30"). `new Date(x).toISOString()` would silently apply the
// browser's local tz, leaking it onto the wire. Reinterpret as UTC instead.
export function parseDatetimeLocalAsUTC(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const withSeconds = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed) ? `${trimmed}:00` : trimmed
  return `${withSeconds}.000Z`
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

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return ''
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: fr })
}
