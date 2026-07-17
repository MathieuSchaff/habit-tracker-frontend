import { useNavigate } from '@tanstack/react-router'
import type { RoutePaths } from '@tanstack/router-core'
import { useCallback } from 'react'

import type { routeTree } from '@/routeTree.gen'

export function useProfileFilterToggle(from: RoutePaths<typeof routeTree>) {
  const navigate = useNavigate({ from })

  return useCallback(
    (checked: boolean) => {
      navigate({
        search: (prev: Record<string, unknown>) => ({ ...prev, profile_filter: checked, page: 1 }),
      })
    },
    [navigate]
  )
}
