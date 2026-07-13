import { describe, expect, test } from 'bun:test'

import { freqTable } from './report'

describe('freqTable', () => {
  test('sorts by count desc and caps at n', () => {
    const freq = new Map([
      ['a', 3],
      ['b', 7],
      ['c', 1],
    ])
    expect(freqTable(freq, 2, 'slug')).toEqual([
      { slug: 'b', count: 7 },
      { slug: 'a', count: 3 },
    ])
  })

  test('labels the key column and returns console.table-ready rows', () => {
    const freq = new Map([['token', 5]])
    expect(freqTable(freq, 10, 'token')).toEqual([{ token: 'token', count: 5 }])
  })

  test('empty map yields no rows', () => {
    expect(freqTable(new Map(), 5, 'x')).toEqual([])
  })
})
