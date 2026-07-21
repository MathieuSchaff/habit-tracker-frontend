import { createIsomorphicFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

// Per-request CSP nonce. The reverse-proxy nginx generates it ($request_id),
// forwards it as the X-CSP-Nonce request header, and sets the matching
// `script-src 'nonce-…'`. Read it on the server so TanStack Start stamps every
// inline hydration script with it. On the client there is nothing to stamp
// (those scripts are already in the DOM), so the client impl returns undefined.
export const getCspNonce = createIsomorphicFn()
  .server(() => getRequestHeader('x-csp-nonce'))
  .client(() => undefined)
