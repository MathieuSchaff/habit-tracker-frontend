import { describe, expect, it } from 'vitest'

import {
  compareInstant,
  formatInstant,
  formatRelative,
  fromDateInputValue,
  nowInstant,
  parseDatetimeLocalAsUTC,
  toDateInputValue,
  todayDateInputValue,
} from '../dates'

describe('toDateInputValue', () => {
  it('returns YYYY-MM-DD from an ISO instant', () => {
    expect(toDateInputValue('2026-05-22T14:30:00.000Z')).toBe('2026-05-22')
  })

  it('returns empty string for null/undefined', () => {
    expect(toDateInputValue(null)).toBe('')
    expect(toDateInputValue(undefined)).toBe('')
  })
})

describe('fromDateInputValue', () => {
  it('promotes YYYY-MM-DD to UTC midnight instant', () => {
    expect(fromDateInputValue('2026-05-22')).toBe('2026-05-22T00:00:00.000Z')
  })
})

describe('todayDateInputValue', () => {
  it('returns a YYYY-MM-DD string for today UTC', () => {
    const value = todayDateInputValue()
    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('nowInstant', () => {
  it('returns a strict ISO 8601 UTC string', () => {
    const value = nowInstant()
    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  })
})

describe('parseDatetimeLocalAsUTC', () => {
  it('reinterprets a tz-naive datetime-local value as UTC without applying the browser tz', () => {
    expect(parseDatetimeLocalAsUTC('2026-05-22T14:30')).toBe('2026-05-22T14:30:00.000Z')
  })

  it('accepts seconds when present', () => {
    expect(parseDatetimeLocalAsUTC('2026-05-22T14:30:45')).toBe('2026-05-22T14:30:45.000Z')
  })

  it('returns empty string for empty input', () => {
    expect(parseDatetimeLocalAsUTC('')).toBe('')
    expect(parseDatetimeLocalAsUTC('   ')).toBe('')
  })
})

describe('formatInstant', () => {
  it('formats with the requested style in FR locale', () => {
    expect(formatInstant('2026-05-22T14:30:00.000Z', 'short')).toBe('22/05/2026')
    expect(formatInstant('2026-05-22T14:30:00.000Z', 'monthYear')).toBe('mai 2026')
  })

  it('returns empty string for null/undefined', () => {
    expect(formatInstant(null)).toBe('')
    expect(formatInstant(undefined)).toBe('')
  })
})

describe('compareInstant', () => {
  it('orders earlier ISO strings before later ones', () => {
    expect(compareInstant('2026-05-01T00:00:00.000Z', '2026-05-22T00:00:00.000Z')).toBe(-1)
    expect(compareInstant('2026-05-22T00:00:00.000Z', '2026-05-01T00:00:00.000Z')).toBe(1)
    expect(compareInstant('2026-05-22T00:00:00.000Z', '2026-05-22T00:00:00.000Z')).toBe(0)
  })
})

describe('formatRelative', () => {
  const ago = (ms: number) => new Date(Date.now() - ms).toISOString()
  const HOUR = 3_600_000
  const DAY = 24 * HOUR

  it('picks the largest fitting unit, FR, with addSuffix', () => {
    expect(formatRelative(ago(3 * HOUR))).toBe('il y a 3 heures')
    expect(formatRelative(ago(5 * DAY))).toBe('il y a 5 jours')
  })

  it('uses numeric:auto wording for ±1 day', () => {
    expect(formatRelative(ago(DAY))).toBe('hier')
    expect(formatRelative(new Date(Date.now() + DAY).toISOString())).toBe('demain')
  })

  it('formats future instants with "dans"', () => {
    expect(formatRelative(new Date(Date.now() + 3 * HOUR).toISOString())).toBe('dans 3 heures')
  })

  it('returns empty string for null/undefined', () => {
    expect(formatRelative(null)).toBe('')
    expect(formatRelative(undefined)).toBe('')
  })
})
