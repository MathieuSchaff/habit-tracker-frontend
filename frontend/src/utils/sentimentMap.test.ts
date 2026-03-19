import { describe, it, expect } from 'vitest'
import { getSentimentEmoji, sentimentEmojis } from './sentimentMap'

describe('sentiment mapping utilities', () => {
  it('correctly maps all 5 sentiment values', () => {
    expect(sentimentEmojis[1]).toBe('🤢')
    expect(sentimentEmojis[3]).toBe('😐')
    expect(sentimentEmojis[5]).toBe('😍')
  })

  it('getSentimentEmoji returns correct emoji or null for invalid input', () => {
    expect(getSentimentEmoji(1)).toBe('🤢')
    expect(getSentimentEmoji(5)).toBe('😍')
    expect(getSentimentEmoji(null)).toBeNull()
    expect(getSentimentEmoji(undefined)).toBeNull()
    expect(getSentimentEmoji(0)).toBeNull()
    expect(getSentimentEmoji(6)).toBeNull()
  })
})
