import { useQuery } from '@tanstack/react-query'

import { useDebounce } from '@/hooks/useDebounce'
import { productQueries } from '@/lib/queries/products'

// Warn before creating a duplicate: debounced name+brand check against API.
export function useDuplicateProductCheck(name: string, brand: string) {
  const debouncedName = useDebounce(name.trim(), 400)
  const debouncedBrand = useDebounce(brand.trim(), 400)

  const { data } = useQuery({
    ...productQueries.checkDuplicate(debouncedName, debouncedBrand),
    enabled: debouncedName.length >= 2 && debouncedBrand.length >= 1,
  })

  return data
}
