// Wire dates are ISO 8601 UTC. Calendar dates round to midnight UTC.
// <input type="date"> only understands "YYYY-MM-DD", so forms convert at the boundary.

export function toDateInputValue(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : ''
}

export function fromDateInputValue(yyyymmdd: string): string {
  return `${yyyymmdd}T00:00:00.000Z`
}

export function todayDateInputValue(): string {
  return new Date().toISOString().slice(0, 10)
}

// Single sanctioned call site for raw Date allocation in components.
export function nowInstant(): string {
  return new Date().toISOString()
}

// datetime-local inputs return tz-naive strings; new Date(x).toISOString() would apply the
// browser's local tz and leak it onto the wire. Reinterpret as UTC instead.
export function parseDatetimeLocalAsUTC(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const withSeconds = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed) ? `${trimmed}:00` : trimmed
  return `${withSeconds}.000Z`
}

// Locale always FR; components must not fall back to browser locale.

type FormatStyle = 'short' | 'medium' | 'long' | 'monthYear'

// Module-scope: Intl constructors are expensive, build once per style.
const FORMATTERS: Record<FormatStyle, Intl.DateTimeFormat> = {
  short: new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
  medium: new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }),
  long: new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
  monthYear: new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }),
}

export function formatInstant(
  iso: string | null | undefined,
  style: FormatStyle = 'short'
): string {
  if (!iso) return ''
  return FORMATTERS[style].format(new Date(iso))
}

// ISO 8601 UTC strings sort lexicographically; use compareInstant(b, a) for descending.
export function compareInstant(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

// Native relative formatting, FR forced. Replaces date-fns (~48 kB eager) for the single
// relative use case. numeric:'auto' yields "hier"/"la semaine dernière" where it reads better.
const RELATIVE_FORMATTER = new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' })

// Largest unit whose magnitude the duration fits under; weeks excluded (FR rarely says "il y a 2 semaines" naturally).
const RELATIVE_DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: 'second' },
  { amount: 60, unit: 'minute' },
  { amount: 24, unit: 'hour' },
  { amount: 30, unit: 'day' },
  { amount: 12, unit: 'month' },
  { amount: Number.POSITIVE_INFINITY, unit: 'year' },
]

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return ''
  let duration = (new Date(iso).getTime() - Date.now()) / 1000
  for (const { amount, unit } of RELATIVE_DIVISIONS) {
    if (Math.abs(duration) < amount) return RELATIVE_FORMATTER.format(Math.round(duration), unit)
    duration /= amount
  }
  return ''
}
