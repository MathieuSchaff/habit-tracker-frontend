import type { QueryClient } from '@tanstack/react-query'

import { useAuthStore } from '../../store/auth'
import { silentRefresh } from '../queries/silentRefresh'
import { hasSessionHint } from './sessionHint'

//  On a cold hard-nav to a role-gated route, the store still holds the default
// role ('user') — not because you are one, but because the boot refresh in __root
// is fire-and-forget and the server hasn't answered yet. A guard that reads `role`
// right now would see that placeholder and redirect a real admin away.
//
// So we wait. silentRefresh is deduped, so this doesn't fire a second request — it
// joins the probe already in flight and resolves once the real role is set. Only
// then does the guard read it. Reading after the answer, not before, is the whole point.
//
// No session hint = no session to wait for → return immediately and let the guard's
// redirect stand (anonymous, correctly sent home).
export async function awaitBootRefresh(queryClient: QueryClient): Promise<void> {
  const store = useAuthStore.getState()
  if (store.accessToken && !store.isTokenExpired()) return
  if (!hasSessionHint()) return
  await silentRefresh(queryClient)
}
