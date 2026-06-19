import type { IngredientInput } from '../types'
import { TENSIOACTIFS_NETTOYANTS } from './tensioactifs-nettoyants'

// Skeleton: the other skincare category files were removed (data lives in the
// SQL snapshot). TENSIOACTIFS_NETTOYANTS is kept as a shape example — add
// category files back and spread them here to seed skincare ingredients again.
export const skincareIngredients: IngredientInput[] = [...TENSIOACTIFS_NETTOYANTS]
