import { useServerHint } from '@/lib/auth/serverHint'
import { useAuthStore } from '@/store/auth'

// Keep the server skeleton until the client decides whether a refresh is needed.
export function useBootPending(): boolean {
  const bootRefreshPending = useAuthStore((s) => s.bootRefreshPending)
  const bootRefreshAttempted = useAuthStore((s) => s.bootRefreshAttempted)
  const accessToken = useAuthStore((s) => s.accessToken)
  const serverHint = useServerHint()
  return bootRefreshPending || (serverHint && !bootRefreshAttempted && !accessToken)
}
