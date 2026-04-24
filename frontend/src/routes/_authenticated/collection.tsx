import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { zodValidator } from '@tanstack/zod-adapter'
import { z } from 'zod'

import { CollectionPage } from '../../features/collection/page/CollectionPage'

export const collectionSearchSchema = z.object({
  sort: z.enum(['name', 'note', 'sentiment', 'date', 'price_asc', 'price_desc']).default('name').catch('name'),
  brand: z.string().default('all').catch('all'),
  kind: z.string().default('all').catch('all'),
  sentiment: z.coerce.number().int().min(1).max(5).or(z.literal('all')).default('all').catch('all'),
  repurchase: z.enum(['yes', 'no', 'unsure', 'all']).default('all').catch('all'),
  minNote: z.coerce.number().min(0).max(20).default(0).catch(0),
  maxPrice: z.union([z.literal(''), z.coerce.number().min(0)]).default('').catch(''),
})

const defaultValues: z.infer<typeof collectionSearchSchema> = {
  sort: 'name',
  brand: 'all',
  kind: 'all',
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
