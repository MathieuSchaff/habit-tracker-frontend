// Contributor "Mes soumissions" dashboard (#16). The owner sees ALL their own
// catalog rows — including hidden ones — with the moderation reason, so they can
// understand a takedown and resubmit. Public reads never expose this (see T1).
export type MySubmissionItem = {
  kind: 'product' | 'ingredient'
  id: string
  name: string
  brand: string | null
  slug: string
  catalogQuality: 'unverified' | 'verified'
  moderationStatus: 'visible' | 'hidden'
  moderationReason: string | null
  createdAt: string
  updatedAt: string
}

export type MySubmissionsResponse = { items: MySubmissionItem[] }
