import { describe, expect, it } from 'vitest'

import { resolveTransitionType } from './resolveTransitionType'

// Only list<->detail and the detail tab swap run a VT; every other nav resolves
// to false (skipped) — see main.tsx KEEP_VT_TYPES.
type Case = {
  name: string
  from: string | null
  to: string
  expected: string[] | false
}

const cases: Case[] = [
  { name: 'no fromLocation', from: null, to: '/products/abc', expected: false },
  { name: 'same path', from: '/products/', to: '/products/', expected: false },

  {
    name: 'list → detail',
    from: '/products/',
    to: '/products/abc',
    expected: ['crossfade', 'shared-element'],
  },
  {
    name: 'detail → list',
    from: '/products/abc',
    to: '/products/',
    expected: ['crossfade', 'shared-element'],
  },
  {
    name: 'ingredients list → detail',
    from: '/ingredients/',
    to: '/ingredients/retinol',
    expected: ['crossfade', 'shared-element'],
  },

  // Canonical app pathnames carry no trailing slash; list-path matching must still hold.
  {
    name: 'list → detail (no trailing slash)',
    from: '/products',
    to: '/products/abc',
    expected: ['crossfade', 'shared-element'],
  },
  {
    name: 'detail → list (no trailing slash)',
    from: '/products/abc',
    to: '/products',
    expected: ['crossfade', 'shared-element'],
  },
  {
    name: 'nav up (collection → products, no trailing slash) = skipped',
    from: '/collection',
    to: '/products',
    expected: false,
  },

  {
    name: 'detail → discussions (same slug = tab swap)',
    from: '/products/abc',
    to: '/products/abc/discussions',
    expected: ['tab-switch'],
  },
  {
    name: 'discussions → detail (same slug = tab swap)',
    from: '/products/abc/discussions',
    to: '/products/abc',
    expected: ['tab-switch'],
  },
  {
    // Different slugs are NOT a tab swap → skipped (no longer falls through to a slide).
    name: 'discussions → detail with different slug = skipped',
    from: '/products/abc/discussions',
    to: '/products/xyz',
    expected: false,
  },

  {
    name: 'detail → edit subpage = skipped',
    from: '/products/abc',
    to: '/products/abc/edit',
    expected: false,
  },
  {
    name: 'edit subpage → detail = skipped',
    from: '/products/abc/edit',
    to: '/products/abc',
    expected: false,
  },

  { name: 'auth in = skipped', from: '/', to: '/auth/login', expected: false },

  {
    name: 'nav down (products → blog) = skipped',
    from: '/products/',
    to: '/blog/',
    expected: false,
  },
  {
    name: 'nav up (collection → products) = skipped',
    from: '/collection/',
    to: '/products/',
    expected: false,
  },

  {
    name: 'fallback (blog article → profile) = skipped',
    from: '/blog/article-x',
    to: '/profile/',
    expected: false,
  },
]

describe('resolveTransitionType', () => {
  for (const { name, from, to, expected } of cases) {
    it(name, () => {
      expect(resolveTransitionType({ fromPathname: from, toPathname: to })).toEqual(expected)
    })
  }
})
