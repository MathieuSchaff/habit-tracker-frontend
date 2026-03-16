import { describe, it, expect } from 'vitest'
import { getSentimentEmoji, sentimentEmojis } from './sentimentMap'

describe('sentimentEmojis', () => {
  it('mappe les 5 valeurs correctement', () => {
    expect(sentimentEmojis[1]).toBe('🤢')
    expect(sentimentEmojis[2]).toBe('👎')
    expect(sentimentEmojis[3]).toBe('😐')
    expect(sentimentEmojis[4]).toBe('👍')
    expect(sentimentEmojis[5]).toBe('😍')
  })
})

describe('getSentimentEmoji', () => {
  it('retourne null pour null', () => {
    expect(getSentimentEmoji(null)).toBeNull()
  })

  it('retourne null pour undefined', () => {
    expect(getSentimentEmoji(undefined)).toBeNull()
  })

  it('retourne null pour une valeur hors range (0)', () => {
    expect(getSentimentEmoji(0)).toBeNull()
  })

  it('retourne null pour une valeur hors range (6)', () => {
    expect(getSentimentEmoji(6)).toBeNull()
  })

  it('retourne null pour une valeur négative', () => {
    expect(getSentimentEmoji(-1)).toBeNull()
  })

  it('retourne 🤢 pour 1', () => {
    expect(getSentimentEmoji(1)).toBe('🤢')
  })

  it('retourne 😍 pour 5', () => {
    expect(getSentimentEmoji(5)).toBe('😍')
  })
})
