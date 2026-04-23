import type { IngredientInput } from '../types'
import { DENTAL_ABRASIFS } from './abrasifs'
import { DENTAL_ACTIFS_COMPLEMENTAIRES } from './actifs-complementaires'
import { DENTAL_ANTI_SENSIBILITE } from './anti-sensibilite'
import { DENTAL_ANTIMICROBIENS } from './antimicrobiens'
import { DENTAL_BLANCHISSANTS } from './blanchissants'
import { DENTAL_DIVERS } from './divers'
import { DENTAL_EXCIPIENTS } from './excipients'
import { DENTAL_REMINERALISATION } from './remineralisation'
import { DENTAL_TENSIOACTIFS_DOUX } from './tensioactifs-doux'
import { DENTAL_ZINC } from './zinc'

export const dentalIngredients: IngredientInput[] = [
  ...DENTAL_REMINERALISATION,
  ...DENTAL_ANTIMICROBIENS,
  ...DENTAL_ANTI_SENSIBILITE,
  ...DENTAL_ABRASIFS,
  ...DENTAL_BLANCHISSANTS,
  ...DENTAL_EXCIPIENTS,
  ...DENTAL_DIVERS,
  ...DENTAL_ZINC,
  ...DENTAL_ACTIFS_COMPLEMENTAIRES,
  ...DENTAL_TENSIOACTIFS_DOUX,
]
