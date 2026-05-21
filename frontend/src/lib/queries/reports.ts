import type { CreateReportInput } from '@habit-tracker/shared'

import { useMutation } from '@tanstack/react-query'

import { api } from '../api'

export function useCreateReport() {
  return useMutation({
    mutationFn: async (body: CreateReportInput) => {
      const res = await api.reports.$post({ json: body })
      if (!res.ok) {
        const json = (await res.json()) as { error?: string }
        throw new Error(json.error ?? 'Failed to submit report')
      }
      const json = await res.json()
      if (!json.success) throw new Error('Report submission error')
      return json.data
    },
  })
}
