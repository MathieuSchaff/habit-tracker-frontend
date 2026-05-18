import { describe, expect, it } from 'vitest'

import { resolveTransitionType } from './resolveTransitionType'

// nav order (from NavItem.tsx): /, /products, /ingredients, /blog, /collection, /tasks.
// The expectations below depend on that order — keep in sync if navItems reshuffles.
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
    // Different slugs are NOT a tab swap — falls through to slide-back (sub → detail).
    name: 'discussions → detail with different slug = slide-back',
    from: '/products/abc/discussions',
    to: '/products/xyz',
    expected: ['slide-back'],
  },

  {
    name: 'detail → edit subpage',
    from: '/products/abc',
    to: '/products/abc/edit',
    expected: ['slide-forward'],
  },
  {
    name: 'edit subpage → detail',
    from: '/products/abc/edit',
    to: '/products/abc',
    expected: ['slide-back'],
  },

  { name: 'auth in', from: '/', to: '/auth/login', expected: ['fade-fast'] },
  { name: 'auth out', from: '/auth/login', to: '/', expected: ['fade-fast'] },

  {
    name: 'nav down (products → blog)',
    from: '/products/',
    to: '/blog/',
    expected: ['fade-nav-down'],
  },
  {
    name: 'nav up (collection → products)',
    from: '/collection/',
    to: '/products/',
    expected: ['fade-nav-up'],
  },

  {
    // Neither side is a nav item nor a known shape → fallback.
    name: 'fallback (blog article → profile)',
    from: '/blog/article-x',
    to: '/profile/',
    expected: ['fade-scale'],
  },
]

describe('resolveTransitionType', () => {
  for (const { name, from, to, expected } of cases) {
    it(name, () => {
      expect(resolveTransitionType({ fromPathname: from, toPathname: to })).toEqual(expected)
    })
  }
})
