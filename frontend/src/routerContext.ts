import type { QueryClient } from '@tanstack/react-query'

interface AuthContext {
  isAuthenticated: boolean
  accessToken: string | null
}

export interface RouterContext {
  queryClient: QueryClient
  auth: AuthContext
}
