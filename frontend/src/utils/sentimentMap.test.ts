import { describe, expect, it } from 'vitest'

import { getSentimentLabel, sentimentLabels } from './sentimentMap'

describe('sentiment mapping utilities', () => {
  it('correctly maps all 6 sentiment values (5 standard + Holy Grail at 6)', () => {
    expect(sentimentLabels[1]).toBe('Pas pour moi')
    expect(sentimentLabels[3]).toBe('Neutre')
    expect(sentimentLabels[5]).toBe("J'adore")
    expect(sentimentLabels[6]).toBe('Saint Graal')
  })

  it('getSentimentLabel returns correct label or null for invalid input', () => {
    expect(getSentimentLabel(1)).toBe('Pas pour moi')
    expect(getSentimentLabel(5)).toBe("J'adore")
    expect(getSentimentLabel(6)).toBe('Saint Graal')
    expect(getSentimentLabel(null)).toBeNull()
    expect(getSentimentLabel(undefined)).toBeNull()
    expect(getSentimentLabel(0)).toBeNull()
    expect(getSentimentLabel(7)).toBeNull()
  })
})
