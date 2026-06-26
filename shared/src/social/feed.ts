import { z } from 'zod'

import { SKIN_CONCERNS } from '../profile'
import type { SocialPostSurfaceView } from './posts'
import { POST_TONES } from './posts'
import type { SimilarityBand } from './similarity'

// The feed scrolls deliberate Posts authored by the viewer's similar cohort (#1).
// Order is recency or similarity only — never reactions/popularity (#3 zéro-tri).
export const FEED_ORDERS = ['recency', 'similarity'] as const
export type FeedOrder = (typeof FEED_ORDERS)[number]

// One tone at a time: default `principal` keeps the feed calm; `coup-de-gueule`
// is a tab entered on purpose (#5 calme). `concern` narrows by bucket (server
// expands it to the clinical family), absent = no concern filter.
export const feedQuerySchema = z.object({
  tone: z.enum(POST_TONES).default('principal'),
  concern: z.enum(SKIN_CONCERNS).optional(),
  order: z.enum(FEED_ORDERS).default('recency'),
})

export type FeedQuery = z.infer<typeof feedQuerySchema>

// A feed item is a surface post plus the author's ordinal closeness band — the
// feed's reason to exist is "people like me", so the band rides along. Never a
// score (#1 zéro-chiffre); `eloigne` never reaches here (cohort strips it).
export type SocialFeedItemView = SocialPostSurfaceView & { authorBand: SimilarityBand }

export type SocialFeedResponse = { posts: SocialFeedItemView[] }
