import type { CriteriaWeights, ProfileLink, SkinConcern, SkinType } from './index'

// RGPD portability export (Article 20). Shape is what the user downloads from
// /api/profile/export. Stays in shared/ so backend service + frontend hook +
// tests can pin to the same contract.

// System-level fields (id, foreign keys, timestamps) live under `_meta` per
// row, so the user-facing data stays scannable while staying complete for
// third-party re-import.
export interface ExportRowMeta {
  id?: string
  userId?: string
  userProductId?: string
  threadId?: string
  productId?: string | null
  ingredientId?: string | null
  authorId?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface ExportUser {
  _meta: ExportRowMeta
  email: string
  role: 'user' | 'admin' | 'contributor'
  emailVerifiedAt: string | null
  deletedAt: string | null
  isDemo: boolean
  expiresAt: string | null
}

export interface ExportProfile {
  _meta: ExportRowMeta
  username: string | null
  bio: string | null
  avatarUrl: string | null
  links: ProfileLink[]
  profilePublic: boolean
  bioPublic: boolean
  avatarPublic: boolean
  linksPublic: boolean
}

export interface ExportDermoProfile {
  _meta: ExportRowMeta
  skinTypes: SkinType[] | null
  fitzpatrickType: number | null
  skinConcerns: SkinConcern[]
  privateNotes: string | null
  skinTypesPublic: boolean
  fitzpatrickPublic: boolean
  skinConcernsPublic: boolean
}

export interface ExportPreferences {
  _meta: ExportRowMeta
  criteriaWeights: CriteriaWeights
  aiConsent: boolean
}

export interface ExportUserProduct {
  _meta: ExportRowMeta
  productId: string
  status: string
  sentiment: number | null
  wouldRepurchase: string | null
  comment: string | null
  ressenti: string[]
  routine: string[]
  preferences: string[]
}

export interface ExportUserProductReview {
  _meta: ExportRowMeta
  tolerance: number | null
  efficacy: number | null
  sensoriality: number | null
  stability: number | null
  mixability: number | null
  valueForMoney: number | null
  comment: string | null
  isPublic: boolean
}

export interface ExportUserProductStatusLog {
  _meta: ExportRowMeta
  fromStatus: string | null
  toStatus: string
  reason: string | null
}

export interface ExportPurchase {
  _meta: ExportRowMeta
  purchasedAt: string
  pricePaidCents: number | null
  openedAt: string | null
  finishedAt: string | null
  expiresAt: string | null
}

export interface ExportUserIngredientAnalysisScore {
  _meta: ExportRowMeta
  suspicionScore: string
  favoriteScore: string
  isSuspect: boolean
  isFavorite: boolean
}

export interface ExportDiscussionThread {
  _meta: ExportRowMeta
  title: string
  content: string
}

export interface ExportDiscussionReply {
  _meta: ExportRowMeta
  content: string
}

export interface UserExport {
  _meta: {
    schemaVersion: '1'
    exportedAt: string
    userId: string
  }
  user: ExportUser
  profile: ExportProfile | null
  dermoProfile: ExportDermoProfile | null
  preferences: ExportPreferences | null
  products: ExportUserProduct[]
  productReviews: ExportUserProductReview[]
  productStatusLog: ExportUserProductStatusLog[]
  purchases: ExportPurchase[]
  ingredientAnalysisScores: ExportUserIngredientAnalysisScore[]
  discussionThreads: ExportDiscussionThread[]
  discussionReplies: ExportDiscussionReply[]
}

export const USER_EXPORT_SCHEMA_VERSION = '1' as const
