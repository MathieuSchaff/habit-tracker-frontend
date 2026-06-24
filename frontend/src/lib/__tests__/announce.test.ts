import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { announce, setLiveRegion } from '../announce'

describe('announce', () => {
  let region: HTMLDivElement

  beforeEach(() => {
    vi.useFakeTimers()
    region = document.createElement('div')
    setLiveRegion(region)
  })

  afterEach(() => {
    setLiveRegion(null)
    vi.useRealTimers()
  })

  it('writes the message into the registered region after a tick', () => {
    announce('Produit ajouté')
    expect(region.textContent).toBe('')
    vi.runAllTimers()
    expect(region.textContent).toBe('Produit ajouté')
  })

  it('re-empties before re-setting so identical consecutive messages still mutate the node', () => {
    announce('Statut mis à jour')
    vi.runAllTimers()
    announce('Statut mis à jour')
    expect(region.textContent).toBe('')
    vi.runAllTimers()
    expect(region.textContent).toBe('Statut mis à jour')
  })

  it('is a no-op when no region is registered', () => {
    setLiveRegion(null)
    expect(() => announce('orphan')).not.toThrow()
  })
})
