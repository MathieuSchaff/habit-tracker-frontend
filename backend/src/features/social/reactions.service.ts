import type {
  ReactableType,
  ReactionInput,
  ReactionKind,
  ReactionListView,
  Reactor,
} from '@aurore/shared'

import { and, eq } from 'drizzle-orm'

import type { DB } from '../../db'
import { profiles } from '../../db/schema/auth/users'
import { discussionReplies, discussionThreads } from '../../db/schema/products/discussions'
import { socialPostReplies, socialPosts } from '../../db/schema/social/posts'
import { socialReactions } from '../../db/schema/social/reactions'
import { SocialReactionError } from './social-reaction-error'

// Polymorphic dispatch: each reactable_type maps to exactly one table whose
// moderation_status gates visibility. A split enum (not a single 'reply') keeps
// this lookup unambiguous — one type, one table (ADR-0013).
async function reactableVisible(db: DB, type: ReactableType, id: string): Promise<boolean> {
  switch (type) {
    case 'post': {
      const [r] = await db
        .select({ id: socialPosts.id })
        .from(socialPosts)
        .where(and(eq(socialPosts.id, id), eq(socialPosts.moderationStatus, 'visible')))
      return Boolean(r)
    }
    case 'thread': {
      const [r] = await db
        .select({ id: discussionThreads.id })
        .from(discussionThreads)
        .where(and(eq(discussionThreads.id, id), eq(discussionThreads.moderationStatus, 'visible')))
      return Boolean(r)
    }
    // Replies gate on BOTH their own moderation_status AND the parent's: hiding a
    // thread/post does not cascade to its replies (per-row moderation), so a reply
    // of a hidden parent must not stay reactable (mirror discussions/posts reads).
    case 'post_reply': {
      const [r] = await db
        .select({ id: socialPostReplies.id })
        .from(socialPostReplies)
        .innerJoin(socialPosts, eq(socialPosts.id, socialPostReplies.postId))
        .where(
          and(
            eq(socialPostReplies.id, id),
            eq(socialPostReplies.moderationStatus, 'visible'),
            eq(socialPosts.moderationStatus, 'visible')
          )
        )
      return Boolean(r)
    }
    case 'thread_reply': {
      const [r] = await db
        .select({ id: discussionReplies.id })
        .from(discussionReplies)
        .innerJoin(discussionThreads, eq(discussionThreads.id, discussionReplies.threadId))
        .where(
          and(
            eq(discussionReplies.id, id),
            eq(discussionReplies.moderationStatus, 'visible'),
            eq(discussionThreads.moderationStatus, 'visible')
          )
        )
      return Boolean(r)
    }
  }
}

// Missing or hidden parent → uniform not-found (anti-enumeration), mirroring
// posts.service's reject-on-hidden.
async function assertReactableVisible(
  db: DB,
  reactableType: ReactableType,
  reactableId: string
): Promise<void> {
  if (!(await reactableVisible(db, reactableType, reactableId)))
    throw new SocialReactionError('reactable_not_found')
}

// Ensure-on: idempotent insert. Re-reacting the same kind is a no-op, never a
// second row — the UNIQUE key makes a tally unrepresentable (ADR-0013).
export async function react(
  userId: string,
  input: ReactionInput,
  db: DB
): Promise<ReactionListView> {
  await assertReactableVisible(db, input.reactableType, input.reactableId)
  await db
    .insert(socialReactions)
    .values({
      reactableType: input.reactableType,
      reactableId: input.reactableId,
      userId,
      kind: input.kind,
    })
    // Explicit target = the idempotency key only; never silently swallow a future
    // unrelated constraint.
    .onConflictDoNothing({
      target: [
        socialReactions.reactableType,
        socialReactions.reactableId,
        socialReactions.userId,
        socialReactions.kind,
      ],
    })
  // No re-check: assertReactableVisible already ran above. Re-asserting inside the
  // read would, if a moderator hides the parent mid-tx, throw 404 and roll back the
  // just-committed insert — a false failure for a valid action.
  return buildReactionList(db, input.reactableType, input.reactableId, userId)
}

// Ensure-off: idempotent delete. The client picks the verb from viewerKinds, so
// "re-react the same kind = remove" is a DELETE on an already-pressed button.
export async function unreact(
  userId: string,
  input: ReactionInput,
  db: DB
): Promise<ReactionListView> {
  await assertReactableVisible(db, input.reactableType, input.reactableId)
  await db
    .delete(socialReactions)
    .where(
      and(
        eq(socialReactions.reactableType, input.reactableType),
        eq(socialReactions.reactableId, input.reactableId),
        eq(socialReactions.userId, userId),
        eq(socialReactions.kind, input.kind)
      )
    )
  return buildReactionList(db, input.reactableType, input.reactableId, userId)
}

// The signed read for the GET route: gate parent visibility (anti-enum 404 on
// missing/hidden), then build the list. react/unreact skip the gate (they already
// asserted before the write) by calling buildReactionList directly.
export async function listReactions(
  db: DB,
  reactableType: ReactableType,
  reactableId: string,
  viewerUserId: string | null
): Promise<ReactionListView> {
  await assertReactableVisible(db, reactableType, reactableId)
  return buildReactionList(db, reactableType, reactableId, viewerUserId)
}

// Who reacted, grouped by kind, plus the viewer's own kinds for button pressed-
// state. Never a count (ADR-0013). innerJoin drops anonymized (null-author) rows;
// force-privated authors are excluded (mirror posts.service) — and the RLS policy
// profiles_select_for_reaction makes non-public-but-signed reactors visible to
// app_runtime in production.
async function buildReactionList(
  db: DB,
  reactableType: ReactableType,
  reactableId: string,
  viewerUserId: string | null
): Promise<ReactionListView> {
  const rows = await db
    .select({
      kind: socialReactions.kind,
      userId: socialReactions.userId,
      username: profiles.username,
      profilePublic: profiles.profilePublic,
    })
    .from(socialReactions)
    .innerJoin(profiles, eq(profiles.userId, socialReactions.userId))
    .where(
      and(
        eq(socialReactions.reactableType, reactableType),
        eq(socialReactions.reactableId, reactableId),
        eq(profiles.forcedPrivateByAdmin, false)
      )
    )
    .orderBy(socialReactions.createdAt)

  // Explicit literal (not Object.fromEntries): the Record type forces every kind to
  // be present, so adding a kind is a compile error here until handled.
  const reactions: Record<ReactionKind, Reactor[]> = { merci: [], 'moi-aussi': [], soutien: [] }
  const viewerKinds: ReactionKind[] = []
  for (const row of rows) {
    if (!row.username) continue // unsigned (username never set) — never shown
    reactions[row.kind].push({ username: row.username, profilePublic: row.profilePublic })
    if (viewerUserId && row.userId === viewerUserId) viewerKinds.push(row.kind)
  }
  return { reactableType, reactableId, reactions, viewerKinds }
}
