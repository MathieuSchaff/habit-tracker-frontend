import type { IngredientInput } from '../seed-ingredients'
import { HAIR_AGENTS_NACRANTS } from './agents-nacrants'
import { HAIR_ANTIPELLICULAIRES } from './antipelliculaires'
import { HAIR_BEURRES_VEGETAUX } from './beurres-vegetaux'
import { HAIR_CERAMIDES_LIPIDES } from './ceramides-lipides'
import { HAIR_CHELATEURS } from './chelateurs'
import { HAIR_CONDITIONNEURS } from './conditionneurs'
import { HAIR_DIVERS } from './divers'
import { HAIR_EPAISSISSANTS } from './epaississants-texturants'
import { HAIR_HUILES_MINERALES } from './huiles-minerales'
import { HAIR_HUILES_VEGETALES } from './huiles-vegetales'
import { HAIR_HUMECTANTS } from './humectants'
import { HAIR_PROTEINES } from './proteines-keratine'
import { HAIR_STIMULANTS_CROISSANCE } from './stimulants-croissance'
import { HAIR_TENSIOACTIFS_AMPHOTERES } from './tensioactifs-amphoteres'
import { HAIR_TENSIOACTIFS_ANIONIQUES } from './tensioactifs-anioniques'
import { HAIR_TENSIOACTIFS_CATIONIQUES } from './tensioactifs-cationiques'
import { HAIR_TENSIOACTIFS_NON_IONIQUES } from './tensioactifs-non-ioniques'

export const haircareIngredients: IngredientInput[] = [
  ...HAIR_TENSIOACTIFS_ANIONIQUES,
  ...HAIR_TENSIOACTIFS_AMPHOTERES,
  ...HAIR_TENSIOACTIFS_NON_IONIQUES,
  ...HAIR_TENSIOACTIFS_CATIONIQUES,
  ...HAIR_CONDITIONNEURS,
  ...HAIR_HUMECTANTS,
  ...HAIR_HUILES_VEGETALES,
  ...HAIR_BEURRES_VEGETAUX,
  ...HAIR_PROTEINES,
  ...HAIR_CERAMIDES_LIPIDES,
  ...HAIR_EPAISSISSANTS,
  ...HAIR_ANTIPELLICULAIRES,
  ...HAIR_STIMULANTS_CROISSANCE,
  ...HAIR_CHELATEURS,
  ...HAIR_AGENTS_NACRANTS,
  ...HAIR_HUILES_MINERALES,
  ...HAIR_DIVERS,
]
