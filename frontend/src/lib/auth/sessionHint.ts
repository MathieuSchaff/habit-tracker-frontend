import { SESSION_HINT_COOKIE } from '@aurore/shared'

// Presence of the non-sensitive hint cookie ⇒ a refresh session may exist on this device.
// Lets the boot probe (useBootRefresh) skip /auth/refresh for anonymous visitors.
export function hasSessionHint(): boolean {
  return document.cookie.split('; ').some((c) => c === `${SESSION_HINT_COOKIE}=1`)
}
