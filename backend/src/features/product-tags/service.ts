import { type Product, products } from '../../db/schema/products/products'
import { type ProductTagType, productTagLinks, productTagTypes } from '../../db/schema/tags/tags'
import { createTagService } from '../_tags/lib/createTagService'

type ProductTagLink = typeof productTagLinks.$inferSelect

/**
 * Export required: leaks via inferred return of listTagsByProduct → getProductFullBySlug (TS4058).
 * @knipignore
 */
export interface ProductTagProjection {
  productTagId: string
  productId: string
  relevance: 'primary' | 'secondary' | 'avoid'
  tagName: string
  tagSlug: string
  tagCategory: string
}

const service = createTagService<ProductTagType, Product, ProductTagProjection, ProductTagLink>({
  defs: productTagTypes,
  defsId: productTagTypes.id,
  defsSlug: productTagTypes.slug,
  defsLabel: productTagTypes.label,
  defsTagType: productTagTypes.tagType,

  links: productTagLinks,
  linkTagIdCol: productTagLinks.productTagId,
  linkOwnerIdCol: productTagLinks.productId,

  ownerTable: products,
  ownerIdCol: products.id,
  ownerNameCol: products.name,

  // Default 'manual' covers the CRUD route + tests that don't opt into a
  // source; auto-tag callers (write.ts, seed-core, backfill runner) pass
  // the originating AutoTagSource explicitly.
  buildLinkValues: (productId, productTagId, relevance, source) => ({
    productId,
    productTagId,
    relevance,
    source: source ?? 'manual',
  }),
  linkProjection: {
    productTagId: productTagLinks.productTagId,
    productId: productTagLinks.productId,
    relevance: productTagLinks.relevance,
    tagName: productTagTypes.label,
    tagSlug: productTagTypes.slug,
    tagCategory: productTagTypes.tagType,
  },
})

export const createProductTag = service.create
export const getProductTagById = service.getById
export const getProductTagBySlug = service.getBySlug
export const listProductTags = service.list
export const updateProductTag = service.update
export const deleteProductTag = service.remove
export const addTagToProduct = service.addToOwner
export const addManyTagsToProduct = service.addManyToOwner
export const listTagsByProduct = service.listTagsByOwner
export const listProductsByTag = service.listOwnersByTag
export const removeTagFromProduct = service.removeFromOwner
export const replaceProductTags = service.replaceOwnerTags
