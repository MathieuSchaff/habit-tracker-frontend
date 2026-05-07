import { differenceInDays, format, subDays } from 'date-fns'

// Convention: all wire/DB dates are UTC ISO 8601 strings.
// - "Instant" columns (timestamptz): full ISO datetime, e.g. "2026-05-07T14:23:10.000Z"
// - "Calendar date" columns (date): YYYY-MM-DD, no timezone

export function nowISO(): string {
  return new Date().toISOString()
}

// Bun.sql returns timestamptz columns as PG-formatted strings
// ("2026-05-07 06:42:48.729+00") — normalize to ISO 8601 UTC at the API
// boundary so the wire matches the documented convention.
export function normalizeInstant(value: string): string {
  return new Date(value).toISOString()
}

export function todayCalendarUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

// Extract the calendar-date portion (UTC) from an ISO instant — never local tz.
export function instantToCalendar(iso: string): string {
  return iso.slice(0, 10)
}

// Promote a calendar date (YYYY-MM-DD) to a UTC midnight instant.
export function calendarToInstant(yyyymmdd: string): string {
  return `${yyyymmdd}T00:00:00.000Z`
}

/**
 * Retourne une date au format ISO (YYYY-MM-DD) avec un offset en jours.
 * Used by seed scripts; UTC by date-fns local-tz semantics is acceptable here
 * since seed runs once at install time.
 */
export function getDate(daysAgo: number = 0): string {
  const date = subDays(new Date(), daysAgo)
  return format(date, 'yyyy-MM-dd')
}

export function getToday(): string {
  return getDate(0)
}

export function getYesterday(): string {
  return getDate(1)
}

export const getTestDate = getDate

export function parseDate(dateStr: string): Date {
  return new Date(dateStr)
}

export function getDaysBetween(start: string, end: string): number {
  return differenceInDays(new Date(end), new Date(start))
}
