import type { IngredientInput } from '../seed-ingredients'
import { DENTAL_ABRASIFS } from './abrasifs'
import { DENTAL_ANTIMICROBIENS } from './antimicrobiens'
import { DENTAL_ANTI_SENSIBILITE } from './anti-sensibilite'
import { DENTAL_BLANCHISSANTS } from './blanchissants'
import { DENTAL_DIVERS } from './divers'
import { DENTAL_EXCIPIENTS } from './excipients'
import { DENTAL_REMINERALISATION } from './remineralisation'

export const dentalIngredients: IngredientInput[] = [
  ...DENTAL_REMINERALISATION,
  ...DENTAL_ANTIMICROBIENS,
  ...DENTAL_ANTI_SENSIBILITE,
  ...DENTAL_ABRASIFS,
  ...DENTAL_BLANCHISSANTS,
  ...DENTAL_EXCIPIENTS,
  ...DENTAL_DIVERS,
]
