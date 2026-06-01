import { queryOptions } from '@tanstack/react-query'

import { api } from '../api'

export const catalogSubmissionQueries = {
  mine: () =>
    queryOptions({
      queryKey: ['catalog-submissions', 'mine'] as const,
      queryFn: async () => {
        const res = await api.me.submissions.$get()
        if (!res.ok) throw new Error('Failed to fetch submissions')
        const json = await res.json()
        if (!json.success) throw new Error('Submissions error')
        return json.data
      },
      staleTime: 1000 * 30,
    }),
}
