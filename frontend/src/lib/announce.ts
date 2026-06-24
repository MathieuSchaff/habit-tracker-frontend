let region: HTMLElement | null = null
let resetTimer: ReturnType<typeof setTimeout> | null = null

// Registered by AppLayout's persistent sr-only region. A live region must already exist
// in the DOM before text is written, so it lives at the app shell, not per-feature.
export function setLiveRegion(el: HTMLElement | null) {
  region = el
}

// Imperative polite announcement for screen readers — for action confirmations whose only
// feedback is an in-place content change (no toast, no focus move). Empties first so an
// identical consecutive message still mutates the node; setTimeout (not rAF) stays jsdom-testable.
export function announce(message: string) {
  if (!region) return
  if (resetTimer) clearTimeout(resetTimer)
  region.textContent = ''
  resetTimer = setTimeout(() => {
    if (region) region.textContent = message
  }, 50)
}
