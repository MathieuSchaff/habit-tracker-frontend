import { type Product, products } from '../../db/schema/products/products'
import { type ProductTagDef, productTagsDefs, tagProducts } from '../../db/schema/tags/tags'
import { createTagService } from '../_tags/lib/createTagService'

type ProductTagLink = typeof tagProducts.$inferSelect

// Export required: leaks via inferred return of listTagsByProduct → getProductFullBySlug (TS4058).
export interface ProductTagProjection {
  productTagId: string
  productId: string
  relevance: 'primary' | 'secondary' | 'avoid'
  tagName: string
  tagSlug: string
  tagCategory: string
}

const service = createTagService<ProductTagDef, Product, ProductTagProjection, ProductTagLink>({
  defs: productTagsDefs,
  defsId: productTagsDefs.id,
  defsSlug: productTagsDefs.slug,
  defsLabel: productTagsDefs.label,
  defsTagType: productTagsDefs.tagType,

  links: tagProducts,
  linkTagIdCol: tagProducts.productTagId,
  linkOwnerIdCol: tagProducts.productId,

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
    productTagId: tagProducts.productTagId,
    productId: tagProducts.productId,
    relevance: tagProducts.relevance,
    tagName: productTagsDefs.label,
    tagSlug: productTagsDefs.slug,
    tagCategory: productTagsDefs.tagType,
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
