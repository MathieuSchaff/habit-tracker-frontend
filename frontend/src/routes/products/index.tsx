import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { zodValidator } from '@tanstack/zod-adapter'
import { z } from 'zod'

import { ProductsPage } from '../../features/products/components/ProductsPage'

export const productsSearchSchema = z.object({
  kind: z.string().array().default([]),
  brand: z.string().array().default([]),
  routine_step: z.string().array().default([]),
  attribute: z.string().array().default([]),
  skin_type: z.string().array().default([]),
  ingredient: z.string().array().default([]),
  concern: z.string().array().default([]),
  product_type: z.string().array().default([]),
  skin_zone: z.string().array().default([]),
  page: z.number().min(1).default(1),
})

const defaultValues = {
  kind: [] as string[],
  brand: [] as string[],
  routine_step: [] as string[],
  attribute: [] as string[],
  skin_type: [] as string[],
  concern: [] as string[],
  product_type: [] as string[],
  skin_zone: [] as string[],
  ingredient: [] as string[],
  page: 1,
}
export type ProductsSearch = z.infer<typeof productsSearchSchema>

export const Route = createFileRoute('/products/')({
  // Search state sync with URL params
  validateSearch: zodValidator(productsSearchSchema),
  search: {
    middlewares: [stripSearchParams(defaultValues)],
  },
  component: ProductsPage,
})
