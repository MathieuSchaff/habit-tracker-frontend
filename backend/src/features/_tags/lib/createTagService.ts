import type { CreateTagInput, UpdateTagInput } from '@habit-tracker/shared'
import { createTagSchema, updateTagSchema } from '@habit-tracker/shared'

import slugify from '@sindresorhus/slugify'
import { and, eq, getTableColumns } from 'drizzle-orm'
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core'

import type { DB } from '../../../db/index'
import { isUniqueViolation } from '../../../lib/helpers'
import { TagError } from '../../product-tags/tag-error'

type Relevance = 'primary' | 'secondary' | 'avoid'
type TagInputItem = string | { tagId: string; relevance?: Relevance }

export interface TagServiceConfig {
  defs: PgTable
  defsId: PgColumn
  defsSlug: PgColumn
  defsLabel: PgColumn
  defsTagType: PgColumn

  links: PgTable
  linkTagIdCol: PgColumn
  linkOwnerIdCol: PgColumn

  ownerTable: PgTable
  ownerIdCol: PgColumn
  ownerNameCol: PgColumn

  // Insert payload shape for the link table (renames generic ownerId/tagId to
  // domain columns: productId/productTagId vs ingredientId/ingredientTagId).
  // `source` is product-only — the ingredient impl drops it. Default 'manual'
  // when omitted so non-auto-tag callers don't have to opt in.
  buildLinkValues: (
    ownerId: string,
    tagId: string,
    relevance: Relevance,
    source?: string
  ) => Record<string, unknown>

  // Drizzle select map for listTagsByOwner — encodes the projection
  // key-renames that the public surface contract requires.
  linkProjection: Record<string, PgColumn>
}

export function createTagService<TDef, TOwnerRow, TProjectionRow, TLinkRow>(cfg: TagServiceConfig) {
  async function create(db: DB, data: CreateTagInput): Promise<TDef> {
    createTagSchema.parse(data)
    const slug = data.slug ?? slugify(data.name)
    try {
      const inserted = await db
        // biome-ignore lint/suspicious/noExplicitAny: Drizzle insert requires literal table for typed values; generics here are by design.
        .insert(cfg.defs as any)
        .values({ slug, label: data.name, tagType: data.category ?? '' })
        .returning()
      const tag = inserted[0] as TDef | undefined
      if (!tag) throw new TagError('tag_creation_failed')
      return tag
    } catch (e) {
      if (e instanceof TagError) throw e
      if (isUniqueViolation(e)) throw new TagError('tag_already_exists')
      throw e
    }
  }

  async function getById(db: DB, id: string): Promise<TDef | undefined> {
    const [tag] = await db.select().from(cfg.defs).where(eq(cfg.defsId, id)).limit(1)
    return tag as TDef | undefined
  }

  async function getBySlug(db: DB, slug: string): Promise<TDef | undefined> {
    const [tag] = await db.select().from(cfg.defs).where(eq(cfg.defsSlug, slug)).limit(1)
    return tag as TDef | undefined
  }

  async function list(
    db: DB,
    params: { category?: string; limit?: number; offset?: number } = {}
  ): Promise<TDef[]> {
    const { category, limit = 100, offset = 0 } = params
    const where = category ? eq(cfg.defsTagType, category) : undefined
    const rows = await db
      .select()
      .from(cfg.defs)
      .where(where)
      .limit(limit)
      .offset(offset)
      .orderBy(cfg.defsLabel)
    return rows as TDef[]
  }

  async function update(db: DB, id: string, data: UpdateTagInput): Promise<TDef> {
    updateTagSchema.parse(data)
    const patch: Partial<{ label: string; tagType: string; slug: string }> = {}
    if (data.name !== undefined) patch.label = data.name
    if (data.category !== undefined) patch.tagType = data.category
    if (data.slug !== undefined) patch.slug = data.slug
    try {
      const updated = await db
        // biome-ignore lint/suspicious/noExplicitAny: see create() — generic Drizzle table.
        .update(cfg.defs as any)
        .set(patch)
        .where(eq(cfg.defsId, id))
        .returning()
      const tag = updated[0] as TDef | undefined
      if (!tag) throw new TagError('tag_not_found')
      return tag
    } catch (e) {
      if (e instanceof TagError) throw e
      if (isUniqueViolation(e)) throw new TagError('tag_already_exists')
      throw e
    }
  }

  async function remove(db: DB, id: string): Promise<boolean> {
    const result = await db.delete(cfg.defs).where(eq(cfg.defsId, id)).returning({ id: cfg.defsId })
    return result.length > 0
  }

  async function addToOwner(
    db: DB,
    ownerId: string,
    tagId: string,
    relevance: Relevance = 'secondary',
    source?: string
  ): Promise<TLinkRow> {
    const [link] = await db
      // biome-ignore lint/suspicious/noExplicitAny: generic Drizzle link table.
      .insert(cfg.links as any)
      .values(cfg.buildLinkValues(ownerId, tagId, relevance, source))
      .returning()
    return link as TLinkRow
  }

  async function addManyToOwner(
    db: DB,
    ownerId: string,
    tagsInput: TagInputItem[],
    source?: string
  ): Promise<TLinkRow[]> {
    if (tagsInput.length === 0) return []
    const values = tagsInput.map((t) => {
      if (typeof t === 'string') return cfg.buildLinkValues(ownerId, t, 'secondary', source)
      return cfg.buildLinkValues(ownerId, t.tagId, t.relevance ?? 'secondary', source)
    })
    const rows = await db
      // biome-ignore lint/suspicious/noExplicitAny: generic Drizzle link table.
      .insert(cfg.links as any)
      .values(values)
      .returning()
    return rows as TLinkRow[]
  }

  async function listTagsByOwner(db: DB, ownerId: string): Promise<TProjectionRow[]> {
    const rows = await db
      .select(cfg.linkProjection)
      .from(cfg.links)
      .innerJoin(cfg.defs, eq(cfg.linkTagIdCol, cfg.defsId))
      .where(eq(cfg.linkOwnerIdCol, ownerId))
      .orderBy(cfg.defsTagType, cfg.defsLabel)
    return rows as TProjectionRow[]
  }

  async function listOwnersByTag(db: DB, tagId: string): Promise<TOwnerRow[]> {
    const rows = await db
      .select(getTableColumns(cfg.ownerTable))
      .from(cfg.links)
      .innerJoin(cfg.ownerTable, eq(cfg.linkOwnerIdCol, cfg.ownerIdCol))
      .where(eq(cfg.linkTagIdCol, tagId))
      .orderBy(cfg.ownerNameCol)
    return rows as TOwnerRow[]
  }

  async function removeFromOwner(db: DB, ownerId: string, tagId: string): Promise<boolean> {
    const result = await db
      .delete(cfg.links)
      .where(and(eq(cfg.linkOwnerIdCol, ownerId), eq(cfg.linkTagIdCol, tagId)))
      .returning({ tagId: cfg.linkTagIdCol })
    return result.length > 0
  }

  async function replaceOwnerTags(
    db: DB,
    ownerId: string,
    tagsInput: TagInputItem[],
    source?: string
  ): Promise<TLinkRow[]> {
    return db.transaction(async (tx) => {
      await tx.delete(cfg.links).where(eq(cfg.linkOwnerIdCol, ownerId))
      if (tagsInput.length === 0) return [] as TLinkRow[]
      const values = tagsInput.map((t) => {
        if (typeof t === 'string') return cfg.buildLinkValues(ownerId, t, 'secondary', source)
        return cfg.buildLinkValues(ownerId, t.tagId, t.relevance ?? 'secondary', source)
      })
      const rows = await tx
        // biome-ignore lint/suspicious/noExplicitAny: generic Drizzle link table.
        .insert(cfg.links as any)
        .values(values)
        .returning()
      return rows as TLinkRow[]
    })
  }

  return {
    create,
    getById,
    getBySlug,
    list,
    update,
    remove,
    addToOwner,
    addManyToOwner,
    listTagsByOwner,
    listOwnersByTag,
    removeFromOwner,
    replaceOwnerTags,
  }
}
