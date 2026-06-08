import { SESSION_HINT_COOKIE } from '@aurore/shared'

// Presence of the non-sensitive hint cookie ⇒ a refresh session may exist on this device.
// Lets __root skip the /auth/refresh probe (and its loader gate) for anonymous visitors.
export function hasSessionHint(): boolean {
  return document.cookie.split('; ').some((c) => c === `${SESSION_HINT_COOKIE}=1`)
}
