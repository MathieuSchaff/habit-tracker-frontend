import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { zodValidator } from '@tanstack/zod-adapter'
import { z } from 'zod'

import { CollectionPage } from '../../features/collection/page/CollectionPage'

export const collectionSearchSchema = z.object({
  sort: z.enum(['name', 'note', 'sentiment', 'date', 'price_asc', 'price_desc']).default('name'),
  brand: z.string().default('all'),
  // `productType` filters by auto-derived TYPE_* tag (type-serum, type-hydratant…)
  // resolved from products.kind via detectKindPrimaryType. Replaced the legacy
  // raw `kind` filter (25 heterogeneous DB values) — see ROADMAP §5 P2.
  productType: z.string().default('all'),
  sentiment: z.coerce.number().int().min(1).max(5).or(z.literal('all')).default('all'),
  repurchase: z.enum(['yes', 'no', 'unsure', 'all']).default('all'),
  minNote: z.coerce.number().min(0).max(20).default(0),
  maxPrice: z.union([z.literal(''), z.coerce.number().min(0)]).default(''),
})

const defaultValues: z.infer<typeof collectionSearchSchema> = {
  sort: 'name',
  brand: 'all',
  productType: 'all',
  sentiment: 'all',
  repurchase: 'all',
  minNote: 0,
  maxPrice: '',
}

export type CollectionSearch = z.infer<typeof collectionSearchSchema>

export const Route = createFileRoute('/_authenticated/collection')({
  validateSearch: zodValidator(collectionSearchSchema),
  search: {
    middlewares: [stripSearchParams(defaultValues)],
  },
  component: CollectionPage,
})
