---
status: accepted
date: 2026-06-25
accepted: 2026-06-25
---

# Home (`/`) is dual-audience — never redirect authenticated users away

The landing route `/` stays reachable by everyone, signed-in or not. It is a permanent hub — re-orientation for lost users, entry to philosophy/help/docs, calm overview — that remains useful after login. Auth state changes what the page *shows*, never *whether it is accessible*. `/` carries no auth `beforeLoad` guard.

## Why

Several signals make `/` read as anonymous-only: login redirects to `/collection`, the navbar hides the `Accueil` item for signed-in users, and `FinalCTASection` swaps one CTA label. A 2026-06-25 architecture review (candidate B) proposed completing that direction — redirect authenticated users from `/` to `/collection` — to give the "who is this page for" rule a single seam.

Rejected. The home is intentionally always-useful: a signed-in user may land there to find privacy/legal, reach future documentation or help, or simply re-orient. Redirecting treats a *content* concern (what to show each audience) as an *access* concern (who may view the page). The locality win is not worth removing a standing, low-cost utility.

## Considered options

- **A. Redirect authed → `/collection`** via index-route `beforeLoad`, making `/` anonymous-only. Rejected: removes the home's standing utility for signed-in users; a logged-in user typing `/` would bounce instead of seeing a useful page.
- **B. Keep `/` open to all; adapt content by auth.** **Chosen.** Access is never gated; differences are expressed in the page's own content.

## Consequences

- `/` has **no** auth `beforeLoad` guard and must not gain one. Access is universal; the logo and BottomNav link home for everyone, and the hidden `Accueil` nav item for authed users is a redundancy trim, not an access gate.
- Auth-conditional behaviour lives in the page's content (e.g. the `FinalCTASection` CTA label), not in routing.
- The "who is `/` for" rule stays distributed across the login redirect, the navbar trim, and per-section content. Accepted as the price of a dual-audience page rather than centralised behind a redirect.
- Future help/documentation entry points may hang off the home.
- Closes the candidate-B redirect proposal from the 2026-06-25 architecture review; future reviews should not re-suggest it.
