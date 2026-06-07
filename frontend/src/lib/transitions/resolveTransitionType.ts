type TransitionInput = {
  fromPathname: string | null
  toPathname: string
}

// Canonical pathnames carry no trailing slash, but the router can surface either
// form; normalize so path matching is reliable.
const stripSlash = (p: string) => (p.length > 1 ? p.replace(/\/+$/, '') : p)
const isListPath = (p: string) => p === '/products' || p === '/ingredients'
const isDetailPath = (p: string) => /^\/(products|ingredients)\/[^/]+\/?$/.test(p)
const isDiscussionsPage = (p: string) => /^\/(products|ingredients)\/[^/]+\/discussions/.test(p)

// Same value = same product/ingredient slug; lets us distinguish a tab swap
// from a navigation away.
const slugKey = (p: string) => p.split('/').slice(1, 3).join('/')

// Only the list<->detail hero morph and the detail tab swap run a transition;
// every other nav skips VT (the ~840ms main-thread freeze isn't worth it).
export function resolveTransitionType(input: TransitionInput): string[] | false {
  const from = input.fromPathname === null ? null : stripSlash(input.fromPathname)
  const to = stripSlash(input.toPathname)
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

  return false
}
