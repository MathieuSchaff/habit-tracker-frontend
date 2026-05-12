import { describe, expect, test } from 'bun:test'

import {
  decidePetaStatus,
  type PerSlugStatus,
  parsePetaPageStatus,
  petaSlug,
  petaSlugVariants,
} from './lib'

describe('petaSlug', () => {
  test('lowercases + strips accents', () => {
    expect(petaSlug('Avène')).toBe('avene')
    expect(petaSlug('Caudalie')).toBe('caudalie')
  })

  test('drops apostrophes outright (PETA URL convention)', () => {
    expect(petaSlug("I'm From")).toBe('im-from')
    expect(petaSlug("L'Oréal")).toBe('loreal')
  })

  test('replaces spaces and other non-alphanumeric runs with single dash', () => {
    expect(petaSlug('Some By Mi')).toBe('some-by-mi')
    expect(petaSlug('Beauty of Joseon')).toBe('beauty-of-joseon')
    expect(petaSlug('Mary&May')).toBe('mary-may')
  })

  test('preserves existing dashes', () => {
    expect(petaSlug('Axis-Y')).toBe('axis-y')
    expect(petaSlug('La Roche-Posay')).toBe('la-roche-posay')
  })

  test('collapses runs of dashes and trims edges', () => {
    expect(petaSlug('  --weleda--  ')).toBe('weleda')
    expect(petaSlug('Dr. Jart+')).toBe('dr-jart')
  })
})

describe('petaSlugVariants', () => {
  test('returns single variant when apostrophe-as-dash matches primary', () => {
    expect(petaSlugVariants('COSRX')).toEqual(['cosrx'])
    expect(petaSlugVariants('Beauty of Joseon')).toEqual(['beauty-of-joseon'])
  })

  test('returns both variants for apostrophe brands', () => {
    expect(petaSlugVariants("I'm From")).toEqual(['im-from', 'i-m-from'])
  })
})

describe('parsePetaPageStatus', () => {
  test('JSON-LD breadcrumb "Cruelty-free Companies" → cruelty-free', () => {
    const html = '<script>{"@type":"BreadcrumbList","name":"Cruelty-free Companies"}</script>'
    expect(parsePetaPageStatus(html)).toBe('cruelty-free')
  })

  test('rendered breadcrumb "Cruelty-free Companies >" → cruelty-free', () => {
    const html = 'Home &gt; Cruelty-free Companies &gt; 100% Pure'
    expect(parsePetaPageStatus(html)).toBe('cruelty-free')
  })

  test('"may not be cruelty-free" → not-cf', () => {
    const html =
      "<h1>CeraVe (L&#039;Oreal) may not be cruelty-free</h1><p>This company hasn't signed PETA's statement.</p>"
    expect(parsePetaPageStatus(html)).toBe('not-cf')
  })

  test('neither marker → unknown', () => {
    expect(parsePetaPageStatus('<html><body>generic page</body></html>')).toBe('unknown')
  })
})

describe('decidePetaStatus', () => {
  const ok = (status: 'cruelty-free' | 'not-cf' | 'unknown'): PerSlugStatus => ({
    httpCode: 200,
    pageStatus: status,
  })
  const notFound = (): PerSlugStatus => ({ httpCode: 404, pageStatus: null })

  test('any cruelty-free → cruelty-free', () => {
    expect(decidePetaStatus(new Map([['x', ok('cruelty-free')]]))).toBe('cruelty-free')
    expect(
      decidePetaStatus(
        new Map([
          ['im-from', notFound()],
          ['i-m-from', ok('cruelty-free')],
        ])
      )
    ).toBe('cruelty-free')
  })

  test('all 404 → not-listed', () => {
    expect(decidePetaStatus(new Map([['x', notFound()]]))).toBe('not-listed')
  })

  test('200 + body says not-cf → not-listed (page exists but unsigned)', () => {
    expect(decidePetaStatus(new Map([['cerave', ok('not-cf')]]))).toBe('not-listed')
  })

  test('200 + parser unknown → unknown', () => {
    expect(decidePetaStatus(new Map([['x', ok('unknown')]]))).toBe('unknown')
  })

  test('non-200/404 only → error', () => {
    expect(decidePetaStatus(new Map([['x', { httpCode: 500, pageStatus: null }]]))).toBe('error')
  })
})
