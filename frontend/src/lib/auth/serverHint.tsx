import { SESSION_HINT_COOKIE } from '@aurore/shared'

import { createIsomorphicFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { createContext, type ReactNode, useContext } from 'react'

// The hint only chooses the pre-hydration shell. Auth still resolves client-side.
export const readServerSessionHint = createIsomorphicFn()
  .server(() => {
    const cookie = getRequestHeader('cookie') ?? ''
    // Raw header path: non-browser agents may omit the RFC 6265 space after ';'.
    return cookie.split(/;\s*/).includes(`${SESSION_HINT_COOKIE}=1`)
  })
  .client(() => false)

// Keep this request-scoped. The Zustand auth store is shared across SSR requests.
const ServerHintContext = createContext(false)

export function ServerHintProvider({ value, children }: { value: boolean; children: ReactNode }) {
  return <ServerHintContext.Provider value={value}>{children}</ServerHintContext.Provider>
}

export function useServerHint(): boolean {
  return useContext(ServerHintContext)
}
