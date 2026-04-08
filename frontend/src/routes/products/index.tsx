import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { zodValidator } from '@tanstack/zod-adapter'
import { z } from 'zod'

import { filterSearchSchema } from '@/component/Filter'
import { ProductsPage } from '../../features/products/components/ProductsPage'
import { FILTER_KEYS } from '../../features/products/filters'

const { schema, defaultValues } = filterSearchSchema(FILTER_KEYS)
const extendedSchema = schema.extend({ profile_filter: z.boolean().default(false) })
const extendedDefaults = { ...defaultValues, profile_filter: false }

export const Route = createFileRoute('/products/')({
  validateSearch: zodValidator(extendedSchema),
  search: {
    middlewares: [stripSearchParams(extendedDefaults)],
  },
  component: ProductsPage,
})
