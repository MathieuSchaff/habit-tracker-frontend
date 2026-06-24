import { announce } from '../lib/announce'

// Stable imperative announcer bound to the app-level live region. Call in a mutation's
// onSuccess when the only feedback is an in-place content change (no toast, no focus move).
export function useAnnounce() {
  return announce
}
