import { navItems } from '@/component/Header/NavItem/NavItem'

type TransitionInput = {
  fromPathname: string | null
  toPathname: string
}

const isListPath = (p: string) => p === '/products/' || p === '/ingredients/'
const isDetailPath = (p: string) => /^\/(products|ingredients)\/[^/]+\/?$/.test(p)
const isSubPage = (p: string) => /^\/(products|ingredients)\/[^/]+\/(edit|discussions)/.test(p)
const isDiscussionsPage = (p: string) => /^\/(products|ingredients)\/[^/]+\/discussions/.test(p)
const isAuth = (p: string) => p.startsWith('/auth/')

// Same value = same product/ingredient slug; lets us distinguish a tab swap
// from a navigation away.
const slugKey = (p: string) => p.split('/').slice(1, 3).join('/')

function navIndex(path: string): number {
  const base = `/${path.split('/')[1] || ''}`
  const normalized = base === '/' ? '/' : base
  return navItems.findIndex((item) => item.to === normalized)
}

export function resolveTransitionType(input: TransitionInput): string[] | false {
  const { fromPathname: from, toPathname: to } = input
  if (!from) return false
  // Same path = search-param-only change; no transition.
  if (from === to) return false

  if ((isListPath(from) && isDetailPath(to)) || (isDetailPath(from) && isListPath(to))) {
    return ['crossfade', 'shared-element']
  }

  const isTabSwitch =
    ((isDetailPath(from) && isDiscussionsPage(to)) ||
      (isDiscussionsPage(from) && isDetailPath(to))) &&
    slugKey(from) === slugKey(to)
  if (isTabSwitch) return ['tab-switch']

  if (isDetailPath(from) && isSubPage(to)) return ['slide-forward']
  if (isSubPage(from) && isDetailPath(to)) return ['slide-back']
  if (isAuth(from) || isAuth(to)) return ['fade-fast']

  const fromIdx = navIndex(from)
  const toIdx = navIndex(to)
  if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
    return toIdx > fromIdx ? ['fade-nav-down'] : ['fade-nav-up']
  }

  return ['fade-scale']
}
