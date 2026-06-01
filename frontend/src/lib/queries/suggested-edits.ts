import type { CreateSuggestedEditInput } from '@aurore/shared'

import { useMutation } from '@tanstack/react-query'

import { api } from '../api'

export function useProposeSuggestedEdit() {
  return useMutation({
    mutationFn: async (body: CreateSuggestedEditInput) => {
      const res = await api['suggested-edits'].$post({ json: body })
      if (!res.ok) {
        const json = (await res.json()) as { error?: string }
        throw new Error(json.error ?? 'Failed to submit suggestion')
      }
      const json = await res.json()
      if (!json.success) throw new Error('Suggestion submission error')
      return json.data
    },
  })
}
